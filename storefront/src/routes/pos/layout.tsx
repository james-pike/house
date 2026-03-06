import { component$, Slot, createContextId, useContextProvider, useStore } from "@builder.io/qwik";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";

export interface PosConfig {
  backendUrl: string;
}

export const PosConfigContext = createContextId<PosConfig>("pos-config");

export const usePosConfig = routeLoader$(async ({ env }) => {
  return {
    backendUrl: env.get("MEDUSA_BACKEND_URL") || "http://localhost:9000",
  };
});

export default component$(() => {
  const config = usePosConfig();
  const posConfig = useStore<PosConfig>({
    backendUrl: config.value.backendUrl,
  });
  useContextProvider(PosConfigContext, posConfig);
  const loc = useLocation();
  const path = loc.url.pathname;

  const isActive = (href: string) => {
    if (href === "/pos/") return path === "/pos/" || path === "/pos";
    return path.startsWith(href);
  };

  return (
    <div class="fixed inset-0 bg-gray-950 text-white flex flex-col overflow-hidden max-w-[100vw]">
      {/* Content area */}
      <div class="flex-1 overflow-hidden">
        <Slot />
      </div>

      {/* Bottom tab bar */}
      <nav class="bg-gray-900 border-t border-gray-800 flex shrink-0 relative">
        <a
          href="/pos"
          class={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
            isActive("/pos/") ? "text-blue-400" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          <span class="text-[10px] font-semibold uppercase tracking-wide">Sale</span>
        </a>
        <a
          href="/pos/receive"
          class={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
            isActive("/pos/receive") ? "text-amber-400" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          <span class="text-[10px] font-semibold uppercase tracking-wide">Receive</span>
        </a>
        <a
          href="/pos/session"
          class={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
            isActive("/pos/session") ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span class="text-[10px] font-semibold uppercase tracking-wide">Session</span>
        </a>
      </nav>
    </div>
  );
});
