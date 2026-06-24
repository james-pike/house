import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { QUICKBOOKS_MODULE } from "../../../modules/quickbooks"
import type QuickbooksModuleService from "../../../modules/quickbooks/service"

// GET /quickbooks/connect — start the OAuth2 flow.
// Unauthenticated so a plain browser navigation can be redirected to Intuit's
// consent screen; the returned `state` guards the callback against CSRF.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const qbo = req.scope.resolve<QuickbooksModuleService>(QUICKBOOKS_MODULE)
  try {
    const url = await qbo.startAuth()
    res.redirect(url)
  } catch (e) {
    res.status(500).json({ message: (e as Error).message })
  }
}
