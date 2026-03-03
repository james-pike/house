import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

export default async function seedCanadaData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const regionService = container.resolve(Modules.REGION)
  const stockLocationService = container.resolve(Modules.STOCK_LOCATION)
  const fulfillmentService = container.resolve(Modules.FULFILLMENT)
  const taxService = container.resolve(Modules.TAX)
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL)
  const storeService = container.resolve(Modules.STORE)

  // ── 1. Fix region countries: swap European countries for Canada ──
  logger.info("Updating region to Canada...")
  const regions = await regionService.listRegions({}, { relations: ["countries"] })
  const region = regions[0]

  // Update region itself
  await regionService.updateRegions(region.id, {
    name: "Canada",
    currency_code: "cad",
    countries: ["ca"],
  })
  logger.info("Region updated to Canada/CAD with country CA.")

  // ── 2. Update stock location to a Canadian address ──
  logger.info("Updating stock location to Canada...")
  const stockLocations = await stockLocationService.listStockLocations({})
  const stockLocation = stockLocations[0]

  await stockLocationService.updateStockLocations(stockLocation.id, {
    name: "Canada Retail Store",
    address: {
      address_1: "100 Queen Street West",
      city: "Toronto",
      country_code: "CA",
      province: "ON",
      postal_code: "M5H 2N2",
    },
  })
  logger.info("Stock location updated: Canada Retail Store, Toronto, ON.")

  // ── 3. Create In-Store sales channel ──
  logger.info("Creating In-Store sales channel...")
  const existingChannels = await salesChannelService.listSalesChannels({})
  let inStoreChannel = existingChannels.find((c: any) => c.name === "In-Store")

  if (!inStoreChannel) {
    const [created] = await salesChannelService.createSalesChannels([
      { name: "In-Store", description: "Point of sale in-store channel" },
    ])
    inStoreChannel = created

    // Link in-store channel to stock location
    await link.create({
      [Modules.SALES_CHANNEL]: { sales_channel_id: inStoreChannel.id },
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    })
  }

  // Rename default channel to "Online Store"
  const defaultChannel = existingChannels.find(
    (c: any) => c.name === "Default Sales Channel" || c.name === "Online Store"
  )
  if (defaultChannel && defaultChannel.name !== "Online Store") {
    await salesChannelService.updateSalesChannels(defaultChannel.id, {
      name: "Online Store",
      description: "Ecommerce online storefront",
    })
  }
  logger.info("Sales channels: Online Store + In-Store.")

  // ── 4. Delete old European tax regions, create Canadian ones ──
  logger.info("Setting up Canadian tax regions...")
  const existingTaxRegions = await taxService.listTaxRegions({})
  for (const tr of existingTaxRegions) {
    try {
      await taxService.deleteTaxRegions(tr.id)
    } catch {
      // parent regions may need children deleted first; handled by ordering
    }
  }
  // Delete again in case child-first ordering was needed
  const remaining = await taxService.listTaxRegions({})
  for (const tr of remaining) {
    try { await taxService.deleteTaxRegions(tr.id) } catch {}
  }

  // Create federal tax region for Canada
  const [caTaxRegion] = await taxService.createTaxRegions([
    { country_code: "ca", provider_id: "tp_system" },
  ])

  // GST 5% federal default rate
  await taxService.createTaxRates([
    {
      tax_region_id: caTaxRegion.id,
      rate: 5,
      code: "GST",
      name: "GST (Federal)",
      is_default: true,
    },
  ])

  // Provincial tax regions
  // HST provinces: combined rate replaces GST (not additive)
  // PST/QST/RST provinces: provincial tax is additive to GST
  const provinces = [
    { province_code: "ON", name: "Ontario HST",        code: "HST", rate: 13 },
    { province_code: "BC", name: "BC PST",             code: "PST", rate: 7 },
    { province_code: "AB", name: "Alberta (GST only)", code: "GST", rate: 5 },
    { province_code: "QC", name: "Quebec QST",         code: "QST", rate: 9.975 },
    { province_code: "SK", name: "Saskatchewan PST",   code: "PST", rate: 6 },
    { province_code: "MB", name: "Manitoba RST",        code: "RST", rate: 7 },
    { province_code: "NB", name: "New Brunswick HST",  code: "HST", rate: 15 },
    { province_code: "NS", name: "Nova Scotia HST",    code: "HST", rate: 15 },
    { province_code: "PE", name: "PEI HST",            code: "HST", rate: 15 },
    { province_code: "NL", name: "Newfoundland HST",   code: "HST", rate: 15 },
    { province_code: "NT", name: "NWT (GST only)",     code: "GST", rate: 5 },
    { province_code: "YT", name: "Yukon (GST only)",   code: "GST", rate: 5 },
    { province_code: "NU", name: "Nunavut (GST only)", code: "GST", rate: 5 },
  ]

  for (const prov of provinces) {
    const [provTaxRegion] = await taxService.createTaxRegions([
      {
        country_code: "ca",
        province_code: prov.province_code,
        parent_id: caTaxRegion.id,
      },
    ])

    await taxService.createTaxRates([
      {
        tax_region_id: provTaxRegion.id,
        rate: prov.rate,
        code: prov.code,
        name: prov.name,
        is_default: true,
      },
    ])
  }
  logger.info("Canadian tax regions created: federal GST 5% + 13 provinces/territories.")

  // ── 5. Update fulfillment/shipping to Canada ──
  // Use raw query approach since fulfillment service APIs are strict
  logger.info("Updating fulfillment to Canada...")
  const dbQuery = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: fSets } = await dbQuery.graph({
    entity: "fulfillment_set",
    fields: ["id", "name", "service_zones.*", "service_zones.geo_zones.*"],
  })
  const fulfillmentSet = fSets[0]
  logger.info(`Found fulfillment set: ${fulfillmentSet.id} - ${fulfillmentSet.name}`)

  // Update fulfillment set name
  await fulfillmentService.updateFulfillmentSets({
    id: fulfillmentSet.id,
    name: "Canada Retail Store Shipping",
  })

  // Delete old European service zones
  if (fulfillmentSet.service_zones?.length) {
    for (const sz of fulfillmentSet.service_zones) {
      await fulfillmentService.deleteServiceZones(sz.id)
    }
  }

  // Create Canada service zone
  const [canadaZone] = await fulfillmentService.createServiceZones([
    {
      name: "Canada",
      fulfillment_set_id: fulfillmentSet.id,
      geo_zones: [
        { country_code: "ca", type: "country" },
      ],
    },
  ])

  // Update shipping options to new zone + rename
  const shippingOptions = await fulfillmentService.listShippingOptions({})
  for (const so of shippingOptions) {
    let name = so.name
    if (name.includes("Standard")) name = "Standard Shipping (5-7 business days)"
    if (name.includes("Express")) name = "Express Shipping (1-2 business days)"
    await fulfillmentService.updateShippingOptions(so.id, {
      name,
      service_zone_id: canadaZone.id,
    })
  }
  logger.info("Shipping updated for Canada.")

  // ── 6. Update store info ──
  logger.info("Updating store info...")
  const [store] = await storeService.listStores()
  await storeService.updateStores(store.id, {
    name: "M1 Retail",
  })
  logger.info("Store name updated to M1 Retail.")

  // ── Summary ──
  logger.info("")
  logger.info("=== Canada Setup Complete ===")
  logger.info(`Store: M1 Retail`)
  logger.info(`Currency: CAD`)
  logger.info(`Region: Canada (CA) - ${region.id}`)
  logger.info(`Stock Location: Canada Retail Store, Toronto ON - ${stockLocation.id}`)
  logger.info(`Sales Channels: Online Store (${defaultChannel?.id}), In-Store (${inStoreChannel.id})`)
  logger.info(`Tax: GST 5% federal + 13 provincial rates`)
  logger.info(`Shipping: Standard + Express across Canada`)
  logger.info("=============================")
}
