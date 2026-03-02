import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const LOW_STOCK_THRESHOLD = 10

export default async function inventoryAlertHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  try {
    const { data: levels } = await query.graph({
      entity: "inventory_level",
      fields: ["id", "stocked_quantity", "inventory_item_id", "location_id"],
      filters: { id: event.data.id },
    })

    if (!levels?.length) return

    const level = levels[0]
    if (Number(level.stocked_quantity) <= LOW_STOCK_THRESHOLD) {
      logger.warn(
        `LOW STOCK ALERT: Inventory item ${level.inventory_item_id} at location ${level.location_id} has only ${level.stocked_quantity} units remaining.`
      )
    }
  } catch (error) {
    logger.error(`Inventory alert handler error: ${error}`)
  }
}

export const config: SubscriberConfig = {
  event: "inventory-level.updated",
}
