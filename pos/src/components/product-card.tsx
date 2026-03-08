import { component$ } from "@builder.io/qwik";

interface Props {
  product: any;
}

export default component$<Props>(({ product }) => {
  const thumbnail = product.thumbnail || product.images?.[0]?.url;

  // Try calculated_price first (from Store API with region), then fall back to variant prices
  const variant = product.variants?.[0];
  const calcPrice = variant?.calculated_price;
  let formattedPrice = "";
  if (calcPrice?.calculated_amount != null) {
    formattedPrice = `$${(calcPrice.calculated_amount / 100).toFixed(2)} ${calcPrice.currency_code?.toUpperCase() || ""}`;
  } else if (variant?.prices?.[0]) {
    const p = variant.prices[0];
    formattedPrice = `$${(p.amount / 100).toFixed(2)} ${p.currency_code?.toUpperCase() || ""}`;
  }

  // Sum inventory across all variants
  const totalStock = product.variants?.reduce(
    (sum: number, v: any) => sum + (v.inventory_quantity ?? 0),
    0
  ) ?? 0;

  return (
    <a
      href={`/products/${product.handle}`}
      class="group bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow overflow-hidden"
    >
      <div class="aspect-square bg-gray-100 overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={product.title}
            width={400}
            height={400}
            class="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div class="w-full h-full flex items-center justify-center text-gray-400">
            No image
          </div>
        )}
      </div>
      <div class="p-4">
        <h3 class="font-medium text-gray-900 group-hover:text-blue-600">
          {product.title}
        </h3>
        {formattedPrice && (
          <p class="mt-1 text-lg font-semibold text-gray-900">
            {formattedPrice}
          </p>
        )}
        <p class={`mt-1 text-sm ${totalStock > 0 ? "text-green-600" : "text-red-500"}`}>
          {totalStock > 0 ? `${totalStock.toLocaleString()} in stock` : "Out of stock"}
        </p>
      </div>
    </a>
  );
});
