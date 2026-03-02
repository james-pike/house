import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { POS_MODULE } from "../modules/pos"

type OpenSessionInput = {
  cashier_id: string
  opening_cash: number
}

const openSessionStep = createStep(
  "open-pos-session",
  async (input: OpenSessionInput, { container }) => {
    const posService = container.resolve(POS_MODULE)
    const session = await posService.createPosSession({
      cashier_id: input.cashier_id,
      opening_cash: input.opening_cash,
      opened_at: new Date(),
      status: "open",
    })
    return new StepResponse(session, session.id)
  },
  async (sessionId, { container }) => {
    if (!sessionId) return
    const posService = container.resolve(POS_MODULE)
    await posService.deletePosSession(sessionId)
  }
)

type CloseSessionInput = {
  session_id: string
  closing_cash: number
  notes?: string
}

const closeSessionStep = createStep(
  "close-pos-session",
  async (input: CloseSessionInput, { container }) => {
    const posService = container.resolve(POS_MODULE)
    const session = await posService.retrievePosSession(input.session_id, {
      relations: ["transactions"],
    })

    const cashTransactions = session.transactions?.filter(
      (t: any) => t.payment_method === "cash"
    ) || []
    const cashSalesTotal = cashTransactions.reduce(
      (sum: number, t: any) => sum + Number(t.total),
      0
    )
    const cashChangeTotal = cashTransactions.reduce(
      (sum: number, t: any) => sum + Number(t.change_given || 0),
      0
    )
    const expectedCash =
      Number(session.opening_cash) + cashSalesTotal - cashChangeTotal
    const discrepancy = input.closing_cash - expectedCash

    const updated = await posService.updatePosSession(input.session_id, {
      status: "closed",
      closing_cash: input.closing_cash,
      expected_cash: expectedCash,
      discrepancy,
      notes: input.notes || null,
      closed_at: new Date(),
    })

    return new StepResponse(updated, {
      session_id: input.session_id,
      previous_status: "open",
    })
  },
  async (compensationData, { container }) => {
    if (!compensationData) return
    const posService = container.resolve(POS_MODULE)
    await posService.updatePosSession(compensationData.session_id, {
      status: "open",
      closing_cash: null,
      expected_cash: null,
      discrepancy: null,
      closed_at: null,
    })
  }
)

export const openPosSessionWorkflow = createWorkflow(
  "open-pos-session",
  (input: OpenSessionInput) => {
    const session = openSessionStep(input)
    return new WorkflowResponse(session)
  }
)

export const closePosSessionWorkflow = createWorkflow(
  "close-pos-session",
  (input: CloseSessionInput) => {
    const session = closeSessionStep(input)
    return new WorkflowResponse(session)
  }
)
