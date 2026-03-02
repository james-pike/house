import { component$ } from "@builder.io/qwik";

interface Props {
  product: any;
}

export default component$<Props>(({ product }) => {
  const thumbnail = product.thumbnail || product.images?.[0]?.url;
  const price = product.variants?.[0]?.prices?.[0];
  const formattedPrice = price
    ? `${(price.amount / 100).toFixed(2)} ${price.currency_code?.toUpperCase()}`
    : "";

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
      </div>
    </a>
  );
});
