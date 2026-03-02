import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { closePosSessionWorkflow } from "../../../../../../workflows/pos-session"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const { closing_cash, notes } = req.body as {
    closing_cash: number
    notes?: string
  }

  const { result } = await closePosSessionWorkflow(req.scope).run({
    input: {
      session_id: id,
      closing_cash: closing_cash || 0,
      notes,
    },
  })

  res.status(200).json({ session: result })
}
