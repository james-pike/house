import { component$, Slot } from "@builder.io/qwik";

export default component$(() => {
  return (
    <div class="min-h-screen bg-gray-50">
      <header class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" class="text-xl font-bold text-gray-900">
            M1 Store
          </a>
          <nav class="flex items-center gap-6">
            <a href="/" class="text-gray-600 hover:text-gray-900">
              Products
            </a>
            <a
              href="/pos"
              class="text-sm bg-gray-900 text-white px-3 py-1.5 rounded hover:bg-gray-700"
            >
              POS
            </a>
          </nav>
        </div>
      </header>
      <main>
        <Slot />
      </main>
    </div>
  );
});
