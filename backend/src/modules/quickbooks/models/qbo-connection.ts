import { model } from "@medusajs/framework/utils"

// Singleton row holding the OAuth2 connection to one QuickBooks Online company.
// Tokens are stored here (not in env) because Intuit's refresh token rotates on
// every refresh and must be persisted. Sandbox MVP stores them in plaintext —
// encrypt-at-rest is a TODO before production.
const QboConnection = model.define("qbo_connection", {
  id: model.id().primaryKey(),
  realm_id: model.text().nullable(),
  access_token: model.text().nullable(),
  refresh_token: model.text().nullable(),
  access_expires_at: model.dateTime().nullable(),
  refresh_expires_at: model.dateTime().nullable(),
  environment: model.text().default("sandbox"),
  // Random value tying an in-flight /connect to its /callback (CSRF guard).
  auth_state: model.text().nullable(),
  connected_at: model.dateTime().nullable(),
})

export default QboConnection
