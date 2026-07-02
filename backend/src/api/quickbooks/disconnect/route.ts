import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { QUICKBOOKS_MODULE } from "../../../modules/quickbooks"
import type QuickbooksModuleService from "../../../modules/quickbooks/service"

// GET /quickbooks/disconnect — the landing page Intuit sends users to when they
// disconnect the app from within QuickBooks. Unauthenticated (browser redirect,
// same as /connect and /callback). Best-effort clears the stored connection so
// the POS reflects the disconnected state; renders a confirmation either way.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const qbo = req.scope.resolve<QuickbooksModuleService>(QUICKBOOKS_MODULE)
  try {
    await qbo.disconnect()
  } catch {
    // Show the confirmation regardless — the token is already dead on Intuit's
    // side, so a failed local cleanup is non-fatal.
  }
  res
    .set("Content-Type", "text/html")
    .send(
      "<h1>QuickBooks disconnected</h1><p>You can close this window and return to the POS.</p>"
    )
}
