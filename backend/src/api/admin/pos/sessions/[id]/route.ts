import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { POS_MODULE } from "../../../../../modules/pos"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const posService = req.scope.resolve(POS_MODULE)

  const session = await posService.retrievePosSession(id, {
    relations: ["transactions"],
  })

  res.status(200).json({ session })
}
