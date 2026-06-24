import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { QUICKBOOKS_MODULE } from "../../../../../../modules/quickbooks"
import type QuickbooksModuleService from "../../../../../../modules/quickbooks/service"
import {
  adjustVariantInventory,
  ReceiveError,
} from "../../../../../../lib/adjust-inventory"
import { createProductForLine } from "../../../../../../lib/create-product-for-line"
import { lineState, poState } from "../../../../../../lib/po-status"

// POST /admin/pos/purchase-orders/:id/receive
// Receive stock against one PO line. Handles partial receipts, multi-delivery
// (each call appends a receipt record), over-receipts (require allow_over),
// barcode/line mismatches, and mapping a previously-unmatched line on the fly.
//
// Body: { po_line_id, quantity, barcode?, allow_over?, note?, location_id? }
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const {
    po_line_id,
    quantity,
    barcode,
    allow_over,
    note,
    location_id,
  } = req.body as {
    po_line_id?: string
    quantity?: number
    barcode?: string
    allow_over?: boolean
    note?: string
    location_id?: string
  }

  const qbo = req.scope.resolve<QuickbooksModuleService>(QUICKBOOKS_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const received_by = (req as any).auth_context?.actor_id ?? null

  if (!po_line_id) {
    return res.status(400).json({ message: "po_line_id is required" })
  }
  if (!quantity || quantity <= 0) {
    return res.status(400).json({ message: "quantity must be a positive number" })
  }

  // Load the PO with its lines.
  const [po] = await qbo.listPurchaseOrders(
    { id },
    { take: 1, relations: ["lines"] }
  )
  if (!po) {
    return res.status(404).json({ message: `Purchase order ${id} not found` })
  }
  if ((po as any).closed) {
    return res.status(409).json({ message: "Purchase order is closed" })
  }

  const line = ((po as any).lines ?? []).find((l: any) => l.id === po_line_id)
  if (!line) {
    return res.status(404).json({ message: "PO line not found on this purchase order" })
  }
  if (line.closed) {
    return res.status(409).json({ message: "This line is closed" })
  }

  // Resolve which variant we're receiving into.
  let targetVariantId: string | null = line.variant_id ?? null
  let mappedFromBarcode = false
  let autoCreated = false

  if (barcode) {
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "sku", "barcode"],
      filters: { $or: [{ sku: barcode }, { barcode }] },
    })
    const scanned = variants?.[0] as any
    if (!scanned) {
      return res.status(404).json({ message: `No variant for barcode ${barcode}` })
    }
    if (line.variant_id && scanned.id !== line.variant_id) {
      // Scanned item doesn't belong to this line — guard against mis-scans.
      return res.status(409).json({
        code: "barcode_mismatch",
        message: `Scanned item does not match this line (expected SKU ${line.sku ?? "?"})`,
      })
    }
    if (!line.variant_id) {
      // Map a previously-unmatched line to the scanned variant.
      targetVariantId = scanned.id
      mappedFromBarcode = true
    }
  }

  // No matched product yet → auto-create one from the PO line and receive into it.
  if (!targetVariantId) {
    targetVariantId = await createProductForLine(req.scope, line)
    autoCreated = true
  }

  // Over-receipt guard — require explicit confirmation to exceed the order.
  const newReceived = Number(line.qty_received || 0) + quantity
  const ordered = Number(line.qty_ordered || 0)
  if (newReceived > ordered && !allow_over) {
    return res.status(409).json({
      code: "over_receipt",
      message: `Receiving ${quantity} exceeds the ${Math.max(
        0,
        ordered - Number(line.qty_received || 0)
      )} remaining. Confirm to over-receive.`,
      ordered,
      already_received: Number(line.qty_received || 0),
      over_by: newReceived - ordered,
    })
  }

  // Move the stock.
  let inventory
  try {
    inventory = await adjustVariantInventory(req.scope, {
      variant_id: targetVariantId,
      quantity,
      location_id,
    })
  } catch (e) {
    if (e instanceof ReceiveError) {
      return res.status(e.status).json({ message: e.message })
    }
    throw e
  }

  // Append an immutable receipt record (audit trail of this delivery).
  await qbo.createPurchaseOrderReceipts({
    line_id: line.id,
    purchase_order_id: po.id,
    variant_id: targetVariantId,
    qty: quantity,
    received_by,
    note: note ?? null,
    received_at: new Date(),
  })

  // Advance the line; backfill the variant link if we mapped or created it.
  await qbo.updatePurchaseOrderLines({
    id: line.id,
    qty_received: newReceived,
    ...(mappedFromBarcode || autoCreated ? { variant_id: targetVariantId } : {}),
  })

  // Recompute PO state from fresh line data.
  const [updated] = await qbo.listPurchaseOrders(
    { id },
    { take: 1, relations: ["lines"] }
  )
  const updatedLine = ((updated as any).lines ?? []).find(
    (l: any) => l.id === line.id
  )

  res.status(200).json({
    ok: true,
    mapped_from_barcode: mappedFromBarcode,
    auto_created: autoCreated,
    line: { id: line.id, item_name: line.item_name, sku: updatedLine?.sku, ...lineState(updatedLine) },
    purchase_order: {
      id: po.id,
      doc_number: (po as any).doc_number,
      ...poState((updated as any).lines ?? [], (updated as any).closed),
    },
    inventory_level: inventory.inventory_level,
  })
}
