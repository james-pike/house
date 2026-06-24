import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"

export type LineForProduct = {
  id: string
  item_name?: string | null
  sku?: string | null
  qbo_line_id?: string | null
}

// Resolves a Medusa variant to receive a PO line into, creating a product for it
// if one doesn't exist yet (auto-create on first receipt). Idempotent: if a
// variant already carries the line's SKU (e.g. created on a previous attempt),
// it's reused instead of creating a duplicate. Returns the variant id.
export async function createProductForLine(
  scope: MedusaContainer,
  line: LineForProduct
): Promise<string> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const title = line.item_name || "Received item"
  const sku = line.sku || `PO-${line.qbo_line_id ?? line.id}`

  // Reuse an existing variant with this SKU if present.
  const { data: existing } = await query.graph({
    entity: "product_variant",
    fields: ["id"],
    filters: { sku },
  })
  if (existing?.[0]?.id) return existing[0].id

  const { result } = await createProductsWorkflow(scope).run({
    input: {
      products: [
        {
          title,
          status: "published",
          options: [{ title: "Default", values: ["Default"] }],
          variants: [
            {
              title,
              sku,
              ...(line.sku ? { barcode: line.sku } : {}),
              manage_inventory: true,
              options: { Default: "Default" },
            },
          ],
        },
      ],
    },
  })

  const product = (result as any[])[0]
  let variantId = product?.variants?.[0]?.id
  if (!variantId) {
    const { data } = await query.graph({
      entity: "product_variant",
      fields: ["id"],
      filters: { product_id: product.id },
    })
    variantId = data?.[0]?.id
  }
  return variantId
}
