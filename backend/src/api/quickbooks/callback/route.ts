import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { QUICKBOOKS_MODULE } from "../../../modules/quickbooks"
import type QuickbooksModuleService from "../../../modules/quickbooks/service"

// GET /quickbooks/callback — Intuit redirects here with ?code, ?realmId, ?state.
// Unauthenticated (it's a server-to-browser redirect from Intuit); the `state`
// check is what ties it back to the /connect that started the flow.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { code, realmId, state, error } = req.query as Record<string, string>

  if (error) {
    return res
      .status(400)
      .set("Content-Type", "text/html")
      .send(`<h1>QuickBooks connection failed</h1><p>${error}</p>`)
  }
  if (!code || !realmId || !state) {
    return res
      .status(400)
      .set("Content-Type", "text/html")
      .send("<h1>QuickBooks connection failed</h1><p>Missing code, realmId, or state.</p>")
  }

  const qbo = req.scope.resolve<QuickbooksModuleService>(QUICKBOOKS_MODULE)
  try {
    await qbo.handleCallback(code, realmId, state)
    res
      .set("Content-Type", "text/html")
      .send(
        "<h1>QuickBooks connected</h1><p>You can close this window and return to the POS.</p>"
      )
  } catch (e) {
    res
      .status(400)
      .set("Content-Type", "text/html")
      .send(`<h1>QuickBooks connection failed</h1><p>${(e as Error).message}</p>`)
  }
}
