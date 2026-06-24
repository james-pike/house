import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { QUICKBOOKS_MODULE } from "../../../../../../modules/quickbooks"
import type QuickbooksModuleService from "../../../../../../modules/quickbooks/service"
import { poState } from "../../../../../../lib/po-status"
import { pushPurchaseOrderBill } from "../../../../../../lib/push-bill"

// POST /admin/pos/purchase-orders/:id/close
// Short-close a PO: mark it done and (by default) cancel the backorder on every
// still-open line. Use when the delivery is finished even though some quantities
// never arrived. Body: { close_lines?: boolean = true }
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const { close_lines = true } = (req.body ?? {}) as { close_lines?: boolean }
  const qbo = req.scope.resolve<QuickbooksModuleService>(QUICKBOOKS_MODULE)
  const received_by = (req as any).auth_context?.actor_id ?? null

  const [po] = await qbo.listPurchaseOrders(
    { id },
    { take: 1, relations: ["lines"] }
  )
  if (!po) {
    return res.status(404).json({ message: `Purchase order ${id} not found` })
  }

  if (close_lines) {
    for (const line of (po as any).lines ?? []) {
      if (!line.closed) {
        await qbo.updatePurchaseOrderLines({ id: line.id, closed: true })
      }
    }
  }

  await qbo.updatePurchaseOrders({
    id,
    closed: true,
    closed_at: new Date(),
    received_by,
  })

  // Push the received quantities to QuickBooks as a Bill. Best-effort: if QBO is
  // unreachable the nightly bill-sweep job will pick it up, so closing never
  // fails on an accounting hiccup.
  let bill: Awaited<ReturnType<typeof pushPurchaseOrderBill>> | null = null
  try {
    bill = await pushPurchaseOrderBill(req.scope, id)
  } catch {
    bill = { ok: false, message: "deferred to scheduled sync" }
  }

  // Mark the PO Closed in QuickBooks too (header status write-back). Best-effort.
  let qb_status: { ok: boolean; skipped?: string; message?: string } | null = null
  try {
    qb_status = await qbo.closeQuickbooksPo((po as any).qbo_id)
  } catch {
    qb_status = { ok: false, message: "deferred" }
  }

  const [updated] = await qbo.listPurchaseOrders(
    { id },
    { take: 1, relations: ["lines"] }
  )

  res.json({
    ok: true,
    bill,
    qb_status,
    purchase_order: {
      id,
      doc_number: (updated as any).doc_number,
      closed: true,
      qbo_bill_id: (updated as any).qbo_bill_id ?? null,
      ...poState((updated as any).lines ?? [], true),
    },
  })
}
