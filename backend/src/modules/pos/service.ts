import { MedusaService } from "@medusajs/framework/utils"
import PosSession, { PosTransaction } from "./models/pos-session"

class PosModuleService extends MedusaService({
  PosSession,
  PosTransaction,
}) {}

export default PosModuleService
