import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { POS_MODULE } from "../modules/pos"

type PosLineItem = {
  variant_id: string
  quantity: number
  unit_price: number
  title: string
}

type PosSaleInput = {
  session_id: string
  items: PosLineItem[]
  payment_method: "cash" | "card"
  amount_tendered?: number
  currency_code: string
  region_id: string
  sales_channel_id: string
  location_id: string
}

const createPosOrderStep = createStep(
  "create-pos-order",
  async (input: PosSaleInput, { container }) => {
    const orderService = container.resolve(Modules.ORDER)

    const subtotal = input.items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0
    )
    const total = subtotal

    const order = await orderService.createOrders({
      region_id: input.region_id,
      currency_code: input.currency_code,
      sales_channel_id: input.sales_channel_id,
      status: "completed",
      items: input.items.map((item) => ({
        title: item.title,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
    })

    return new StepResponse(
      { order, subtotal, total },
      order.id
    )
  },
  async (orderId, { container }) => {
    if (!orderId) return
    const orderService = container.resolve(Modules.ORDER)
    await orderService.deleteOrders(orderId)
  }
)

const adjustInventoryStep = createStep(
  "adjust-pos-inventory",
  async (
    input: { items: PosLineItem[]; location_id: string },
    { container }
  ) => {
    const inventoryService = container.resolve(Modules.INVENTORY)
    const query = container.resolve("query")

    const adjustments: { inventory_item_id: string; quantity: number }[] = []

    for (const item of input.items) {
      const { data: variants } = await query.graph({
        entity: "product_variant",
        fields: ["id", "inventory_items.inventory.*"],
        filters: { id: item.variant_id },
      })

      if (variants[0]?.inventory_items?.[0]?.inventory?.id) {
        const inventoryItemId = variants[0].inventory_items[0].inventory.id
        await inventoryService.adjustInventory(
          inventoryItemId,
          input.location_id,
          -item.quantity
        )
        adjustments.push({
          inventory_item_id: inventoryItemId,
          quantity: item.quantity,
        })
      }
    }

    return new StepResponse(adjustments, {
      adjustments,
      location_id: input.location_id,
    })
  },
  async (compensationData, { container }) => {
    if (!compensationData) return
    const inventoryService = container.resolve(Modules.INVENTORY)
    for (const adj of compensationData.adjustments) {
      await inventoryService.adjustInventory(
        adj.inventory_item_id,
        compensationData.location_id,
        adj.quantity
      )
    }
  }
)

const recordPosTransactionStep = createStep(
  "record-pos-transaction",
  async (
    input: {
      session_id: string
      order_id: string
      payment_method: "cash" | "card"
      subtotal: number
      total: number
      amount_tendered?: number
    },
    { container }
  ) => {
    const posService = container.resolve(POS_MODULE)

    const change_given =
      input.payment_method === "cash" && input.amount_tendered
        ? input.amount_tendered - input.total
        : 0

    const transaction = await posService.createPosTransactions({
      session_id: input.session_id,
      order_id: input.order_id,
      payment_method: input.payment_method,
      subtotal: input.subtotal,
      tax: 0,
      total: input.total,
      amount_tendered: input.amount_tendered || input.total,
      change_given,
    })

    return new StepResponse(transaction, transaction.id)
  },
  async (transactionId, { container }) => {
    if (!transactionId) return
    const posService = container.resolve(POS_MODULE)
    await posService.deletePosTransactions(transactionId)
  }
)

export const posSaleWorkflow = createWorkflow(
  "pos-sale",
  (input: PosSaleInput) => {
    const { order, subtotal, total } = createPosOrderStep(input)

    const inventoryInput = transform({ input }, (data) => ({
      items: data.input.items,
      location_id: data.input.location_id,
    }))
    adjustInventoryStep(inventoryInput)

    const transactionInput = transform(
      { input, order, subtotal, total },
      (data) => ({
        session_id: data.input.session_id,
        order_id: data.order.id,
        payment_method: data.input.payment_method,
        subtotal: data.subtotal,
        total: data.total,
        amount_tendered: data.input.amount_tendered,
      })
    )
    const transaction = recordPosTransactionStep(transactionInput)

    const result = transform(
      { order, transaction, subtotal, total, input },
      (data) => ({
        order_id: data.order.id,
        transaction_id: data.transaction.id,
        subtotal: data.subtotal,
        total: data.total,
        change_given: data.transaction.change_given,
        payment_method: data.input.payment_method,
        items: data.input.items,
        currency_code: data.input.currency_code,
      })
    )

    return new WorkflowResponse(result)
  }
)
