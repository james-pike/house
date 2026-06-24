import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { QUICKBOOKS_MODULE } from "../../../../../../../../modules/quickbooks"
import type QuickbooksModuleService from "../../../../../../../../modules/quickbooks/service"
import { lineState } from "../../../../../../../../lib/po-status"

// POST /admin/pos/purchase-orders/:id/lines/:lineId/close
// Close (or reopen) a single line. Closing cancels its backorder — useful when
// one SKU is discontinued/short but the rest of the PO is still coming.
// Body: { reopen?: boolean }
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { lineId } = req.params
  const { reopen = false } = (req.body ?? {}) as { reopen?: boolean }
  const qbo = req.scope.resolve<QuickbooksModuleService>(QUICKBOOKS_MODULE)

  const [line] = await qbo.listPurchaseOrderLines({ id: lineId }, { take: 1 })
  if (!line) {
    return res.status(404).json({ message: `PO line ${lineId} not found` })
  }

  await qbo.updatePurchaseOrderLines({ id: lineId, closed: !reopen })

  const [updated] = await qbo.listPurchaseOrderLines({ id: lineId }, { take: 1 })
  res.json({
    ok: true,
    line: {
      id: lineId,
      item_name: (updated as any).item_name,
      sku: (updated as any).sku,
      ...lineState(updated as any),
    },
  })
}
