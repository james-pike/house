import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { QUICKBOOKS_MODULE } from "../../../../../modules/quickbooks"
import type QuickbooksModuleService from "../../../../../modules/quickbooks/service"

// GET /admin/pos/quickbooks/company — reads CompanyInfo from QuickBooks.
// This is the Phase 0 smoke test: a 200 here proves OAuth + token refresh +
// authenticated API access all work end to end.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const qbo = req.scope.resolve<QuickbooksModuleService>(QUICKBOOKS_MODULE)
  try {
    const data = await qbo.getCompanyInfo()
    res.json(data)
  } catch (e) {
    res.status(400).json({ message: (e as Error).message })
  }
}
