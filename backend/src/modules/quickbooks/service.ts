import { MedusaService } from "@medusajs/framework/utils"
import { randomBytes } from "crypto"
import QboConnection from "./models/qbo-connection"
import PurchaseOrder, {
  PurchaseOrderLine,
  PurchaseOrderReceipt,
} from "./models/purchase-order"
import SalesSyncLog from "./models/sales-sync-log"

export type QboOptions = {
  clientId?: string
  clientSecret?: string
  redirectUri?: string
  environment?: "sandbox" | "production"
}

// Intuit OAuth2 + Accounting API endpoints.
const AUTHORIZE_URL = "https://appcenter.intuit.com/connect/oauth2"
const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
const REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke"
const SANDBOX_API = "https://sandbox-quickbooks.api.intuit.com"
const PRODUCTION_API = "https://quickbooks.api.intuit.com"
const SCOPE = "com.intuit.quickbooks.accounting"
const MINOR_VERSION = "73"

type TokenResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
  x_refresh_token_expires_in: number
  token_type: string
}

class QuickbooksModuleService extends MedusaService({
  QboConnection,
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseOrderReceipt,
  SalesSyncLog,
}) {
  protected options_: QboOptions

  constructor(container: unknown, options: QboOptions) {
    super(...arguments)
    this.options_ = options || {}
  }

  private apiBase(): string {
    return (this.options_.environment ?? "sandbox") === "production"
      ? PRODUCTION_API
      : SANDBOX_API
  }

  // The single connection row, or null if QuickBooks was never connected.
  async getConnection(): Promise<any | null> {
    const rows = await this.listQboConnections(
      {},
      { take: 1, order: { created_at: "ASC" } }
    )
    return rows?.[0] ?? null
  }

  // Step 1 of OAuth: mint a CSRF state, stash it, and return the consent URL the
  // user's browser should be sent to.
  async startAuth(): Promise<string> {
    if (!this.options_.clientId || !this.options_.redirectUri) {
      throw new Error(
        "QuickBooks not configured — set QBO_CLIENT_ID and QBO_REDIRECT_URI"
      )
    }
    const state = randomBytes(16).toString("hex")
    const conn = await this.getConnection()
    if (conn) {
      await this.updateQboConnections({ id: conn.id, auth_state: state })
    } else {
      await this.createQboConnections({
        environment: this.options_.environment ?? "sandbox",
        auth_state: state,
      })
    }

    const params = new URLSearchParams({
      client_id: this.options_.clientId,
      response_type: "code",
      scope: SCOPE,
      redirect_uri: this.options_.redirectUri,
      state,
    })
    return `${AUTHORIZE_URL}?${params.toString()}`
  }

  // Step 2 of OAuth: Intuit redirected back with an auth code + realmId. Validate
  // the state, exchange the code for tokens, and persist them.
  async handleCallback(
    code: string,
    realmId: string,
    state: string
  ): Promise<void> {
    const conn = await this.getConnection()
    if (!conn) {
      throw new Error("No pending QuickBooks authorization")
    }
    if (!state || conn.auth_state !== state) {
      throw new Error("Invalid OAuth state")
    }
    const token = await this.tokenRequest({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.options_.redirectUri ?? "",
    })
    await this.persistToken(conn.id, token, realmId)
  }

  // Returns a non-expired access token (refreshing if needed) plus the realm.
  async getValidAccessToken(): Promise<{ accessToken: string; realmId: string }> {
    const conn = await this.getConnection()
    if (!conn || !conn.refresh_token || !conn.realm_id) {
      throw new Error("QuickBooks not connected")
    }
    const now = Date.now()
    const expiresAt = conn.access_expires_at
      ? new Date(conn.access_expires_at).getTime()
      : 0
    // Refresh a minute early to avoid racing the expiry.
    if (!conn.access_token || now >= expiresAt - 60_000) {
      let token: TokenResponse
      try {
        token = await this.tokenRequest({
          grant_type: "refresh_token",
          refresh_token: conn.refresh_token,
        })
      } catch (e) {
        // 400 (invalid_grant) / 401 => the refresh token is dead (expired or
        // revoked). Clear the connection so the POS shows "not connected" and
        // asks the user to reconnect. Transient errors (network/5xx) are
        // rethrown untouched so we don't wipe a still-valid connection.
        const status = (e as { status?: number }).status
        if (status === 400 || status === 401) {
          await this.invalidateConnection(conn.id)
          throw new Error("QuickBooks authorization expired — please reconnect.")
        }
        throw e
      }
      await this.persistToken(conn.id, token)
      return { accessToken: token.access_token, realmId: conn.realm_id }
    }
    return { accessToken: conn.access_token, realmId: conn.realm_id }
  }

  // Clear the stored tokens (keeping the row) so getStatus reports "not
  // connected" after an auth failure, prompting the user to reconnect.
  private async invalidateConnection(id: string): Promise<void> {
    await this.updateQboConnections({
      id,
      access_token: null,
      refresh_token: null,
      access_expires_at: null,
      refresh_expires_at: null,
      auth_state: null,
    })
  }

  // Authenticated call against /v3/company/{realmId}{path}. Returns parsed JSON.
  async apiFetch(path: string, init?: RequestInit): Promise<any> {
    const { accessToken, realmId } = await this.getValidAccessToken()
    const sep = path.includes("?") ? "&" : "?"
    const url = `${this.apiBase()}/v3/company/${realmId}${path}${sep}minorversion=${MINOR_VERSION}`
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    })
    // A 401 after we just supplied a fresh token means the grant was revoked
    // server-side — clear the connection and prompt a reconnect.
    if (res.status === 401) {
      const conn = await this.getConnection()
      if (conn) await this.invalidateConnection(conn.id)
      throw new Error("QuickBooks authorization expired — please reconnect.")
    }
    if (!res.ok) {
      throw new Error(`QBO API ${res.status}: ${await res.text()}`)
    }
    return res.json()
  }

  // Convenience: read CompanyInfo — the cheapest call that proves the whole chain.
  async getCompanyInfo(): Promise<any> {
    const conn = await this.getConnection()
    if (!conn?.realm_id) {
      throw new Error("QuickBooks not connected")
    }
    return this.apiFetch(`/companyinfo/${conn.realm_id}`)
  }

  // Run a QuickBooks SQL-ish query (e.g. "SELECT * FROM PurchaseOrder").
  async query(statement: string): Promise<any> {
    return this.apiFetch(`/query?query=${encodeURIComponent(statement)}`)
  }

  // Page through every row of an entity. QBO caps a page at 1000 rows and uses
  // 1-based STARTPOSITION; a short page means we've reached the end.
  async fetchAll(entity: string): Promise<any[]> {
    const out: any[] = []
    const pageSize = 1000
    let start = 1
    // Guard against an unbounded loop if QBO ever misreports counts.
    for (let guard = 0; guard < 1000; guard++) {
      const resp = await this.query(
        `SELECT * FROM ${entity} STARTPOSITION ${start} MAXRESULTS ${pageSize}`
      )
      const rows: any[] = resp?.QueryResponse?.[entity] ?? []
      out.push(...rows)
      if (rows.length < pageSize) break
      start += pageSize
    }
    return out
  }

  async fetchPurchaseOrders(): Promise<any[]> {
    return this.fetchAll("PurchaseOrder")
  }

  async fetchItems(): Promise<any[]> {
    return this.fetchAll("Item")
  }

  // POST a new entity (Bill, SalesReceipt, ...) to the QuickBooks Accounting API.
  async createEntity(entity: string, body: unknown): Promise<any> {
    return this.apiFetch(`/${entity.toLowerCase()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  }

  // Mark a QuickBooks PurchaseOrder as Closed (header POStatus). Fetches the
  // current SyncToken first, then sparse-updates. Idempotent.
  async closeQuickbooksPo(
    qboId: string
  ): Promise<{ ok: boolean; skipped?: string; message?: string }> {
    let po: any
    try {
      po = (await this.query(`select * from PurchaseOrder where Id = '${qboId}'`))
        ?.QueryResponse?.PurchaseOrder?.[0]
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
    if (!po) return { ok: false, message: "PO not found in QuickBooks" }
    if (po.POStatus === "Closed") return { ok: true, skipped: "already_closed" }
    try {
      await this.createEntity("purchaseorder", {
        Id: po.Id,
        SyncToken: po.SyncToken,
        sparse: true,
        POStatus: "Closed",
      })
      return { ok: true }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  }

  // Find a Customer by exact DisplayName, creating it if absent. Used to bucket
  // POS/storefront sales under one walk-in customer in QuickBooks.
  async findOrCreateCustomer(displayName: string): Promise<any> {
    const safe = displayName.replace(/'/g, "\\'")
    const found = (await this.query(
      `select * from Customer where DisplayName = '${safe}'`
    ))?.QueryResponse?.Customer?.[0]
    if (found) return found
    const created = await this.createEntity("customer", {
      DisplayName: displayName,
    })
    return created?.Customer
  }

  // Tear down the QuickBooks connection: revoke the token with Intuit (best
  // effort) and drop the local connection row so the POS shows "not connected".
  // Idempotent — safe to call when nothing is connected.
  async disconnect(): Promise<{ ok: boolean; revoked: boolean }> {
    const conn = await this.getConnection()
    if (!conn) {
      return { ok: true, revoked: false }
    }
    let revoked = false
    const token = conn.refresh_token || conn.access_token
    if (token) {
      try {
        await this.revokeToken(token)
        revoked = true
      } catch {
        // Intuit may have already invalidated it (e.g. user disconnected from
        // the QuickBooks side); clear our copy regardless.
      }
    }
    await this.deleteQboConnections(conn.id)
    return { ok: true, revoked }
  }

  // Revoke an access or refresh token at Intuit. Uses Basic client auth.
  private async revokeToken(token: string): Promise<void> {
    const creds = Buffer.from(
      `${this.options_.clientId}:${this.options_.clientSecret}`
    ).toString("base64")
    const res = await fetch(REVOKE_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ token }),
    })
    if (!res.ok) {
      throw new Error(`QBO token revoke ${res.status}: ${await res.text()}`)
    }
  }

  // Connection summary for the status endpoint (never leaks token values).
  async getStatus(): Promise<Record<string, unknown>> {
    const conn = await this.getConnection()
    return {
      connected: !!(conn?.access_token && conn?.realm_id),
      realm_id: conn?.realm_id ?? null,
      environment: this.options_.environment ?? conn?.environment ?? "sandbox",
      access_expires_at: conn?.access_expires_at ?? null,
      refresh_expires_at: conn?.refresh_expires_at ?? null,
      connected_at: conn?.connected_at ?? null,
    }
  }

  private async persistToken(
    id: string,
    token: TokenResponse,
    realmId?: string
  ): Promise<void> {
    const now = Date.now()
    const data: Record<string, unknown> = {
      id,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      access_expires_at: new Date(now + token.expires_in * 1000),
      refresh_expires_at: new Date(
        now + token.x_refresh_token_expires_in * 1000
      ),
      auth_state: null,
      connected_at: new Date(now),
    }
    // Only set realm on the initial connect; refreshes keep the existing one.
    if (realmId) {
      data.realm_id = realmId
    }
    await this.updateQboConnections(data)
  }

  private async tokenRequest(
    params: Record<string, string>
  ): Promise<TokenResponse> {
    const creds = Buffer.from(
      `${this.options_.clientId}:${this.options_.clientSecret}`
    ).toString("base64")
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams(params).toString(),
    })
    if (!res.ok) {
      const err = new Error(
        `QBO token request ${res.status}: ${await res.text()}`
      ) as Error & { status?: number }
      err.status = res.status
      throw err
    }
    return res.json()
  }
}

export default QuickbooksModuleService
