import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { QUICKBOOKS_MODULE } from "../../../../../modules/quickbooks"
import type QuickbooksModuleService from "../../../../../modules/quickbooks/service"

// GET /admin/pos/quickbooks/status — connection summary for the POS admin UI.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const qbo = req.scope.resolve<QuickbooksModuleService>(QUICKBOOKS_MODULE)
  const status = await qbo.getStatus()
  res.json(status)
}
