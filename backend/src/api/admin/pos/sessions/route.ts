import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { openPosSessionWorkflow } from "../../../../workflows/pos-session"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { opening_cash } = req.body as { opening_cash: number }
  const cashier_id = req.auth_context?.actor_id

  if (!cashier_id) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const { result } = await openPosSessionWorkflow(req.scope).run({
    input: {
      cashier_id,
      opening_cash: opening_cash || 0,
    },
  })

  res.status(200).json({ session: result })
}
