import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { QUICKBOOKS_MODULE } from "../../../../../modules/quickbooks"
import type QuickbooksModuleService from "../../../../../modules/quickbooks/service"

// POST /admin/pos/quickbooks/disconnect — admin-initiated disconnect from the
// POS. Revokes the token at Intuit and clears the stored connection.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const qbo = req.scope.resolve<QuickbooksModuleService>(QUICKBOOKS_MODULE)
  try {
    const result = await qbo.disconnect()
    res.json(result)
  } catch (e) {
    res.status(400).json({ ok: false, message: (e as Error).message })
  }
}
