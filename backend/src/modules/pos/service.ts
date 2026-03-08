import { MedusaService } from "@medusajs/framework/utils"
import PosSession, { PosTransaction } from "./models/pos-session"
import ReceiveLog from "./models/receive-log"

class PosModuleService extends MedusaService({
  PosSession,
  PosTransaction,
  ReceiveLog,
}) {}

export default PosModuleService
