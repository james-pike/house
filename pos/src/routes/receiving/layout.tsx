import { component$, Slot, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import { CARD, FIELD, BTN_PRIMARY } from "../../lib/ui";

// Desktop-first shell for the inventory/receiving app. Renders over the
// storefront chrome (fixed inset-0), lays out wide, and gates on an admin login.
// All theming comes from the .recv-* design system in global.css.
export default component$(() => {
  const ready = useSignal(false);
  const token = useSignal("");
  const email = useSignal("admin@safetyhouse.ca");
  const password = useSignal("");
  const err = useSignal("");
  const busy = useSignal(false);
  const theme = useSignal<"light" | "classic" | "dark">("light");

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    token.value = localStorage.getItem("pos_token") || "";
    const saved = localStorage.getItem("recv_theme");
    theme.value = saved === "dark" || saved === "classic" || saved === "light" ? saved : "light";
    ready.value = true;
  });

  // Cycle: light (gray cards) → classic (white cards) → dark.
  const toggleTheme = $(() => {
    const next = { light: "classic", classic: "dark", dark: "light" } as const;
    theme.value = next[theme.value];
    localStorage.setItem("recv_theme", theme.value);
  });

  const login = $(async () => {
    err.value = "";
    busy.value = true;
    try {
      const res = await fetch("/api/auth/user/emailpass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.value, password: password.value }),
      });
      if (!res.ok) {
        err.value = "Login failed — check your credentials.";
      } else {
        const d = await res.json();
        localStorage.setItem("pos_token", d.token);
        token.value = d.token;
      }
    } catch (e: any) {
      err.value = e.message;
    }
    busy.value = false;
  });

  const logout = $(() => {
    localStorage.removeItem("pos_token");
    token.value = "";
  });

  return (
    <div class={`recv ${theme.value === "dark" ? "recv-dark" : theme.value === "classic" ? "recv-classic" : ""} fixed inset-0 flex flex-col overflow-hidden`}>

      {/* Top bar */}
      <header class="recv-topbar relative shrink-0 h-14 flex items-center px-5 gap-5">
        <Link href="/receiving" class="flex items-center gap-2.5">
          <div class="recv-logo w-8 h-8 rounded-lg flex items-center justify-center">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1b1b1b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div class="leading-tight">
            <div class="font-semibold text-sm tracking-wide">The Safety House</div>
            <div class="recv-faint text-xs -mt-0.5">Receiving &amp; Inventory</div>
          </div>
        </Link>
        <div class="ml-auto flex items-center gap-3">
          <button class="recv-btn recv-btn--ghost w-8 h-8" onClick$={toggleTheme} title={`Theme: ${theme.value} (click to change)`} aria-label="Toggle theme">
            {theme.value === "dark" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : theme.value === "classic" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            )}
          </button>
          {token.value && (
            <button class="recv-muted text-xs hover:recv-strong transition-colors" onClick$={logout}>
              Sign out
            </button>
          )}
        </div>
      </header>

      <main class="relative flex-1 overflow-y-auto">
        {!ready.value ? null : token.value ? (
          <Slot />
        ) : (
          <div class="h-full flex items-center justify-center px-4">
            <div class={`w-96 ${CARD} p-7`}>
              <div class="recv-logo w-11 h-11 rounded-xl flex items-center justify-center mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1b1b1b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                </svg>
              </div>
              <h1 class="text-lg font-semibold mb-1">Sign in to Receiving</h1>
              <p class="recv-muted text-sm mb-5">Inventory &amp; purchase-order access</p>
              <label class="recv-muted block text-xs font-medium mb-1.5">Email</label>
              <input
                type="email"
                class={`w-full mb-4 px-3.5 py-2.5 text-sm ${FIELD}`}
                value={email.value}
                onInput$={(e) => (email.value = (e.target as HTMLInputElement).value)}
              />
              <label class="recv-muted block text-xs font-medium mb-1.5">Password</label>
              <input
                type="password"
                class={`w-full mb-5 px-3.5 py-2.5 text-sm ${FIELD}`}
                value={password.value}
                onInput$={(e) => (password.value = (e.target as HTMLInputElement).value)}
                onKeyDown$={async (e) => { if (e.key === "Enter") await login(); }}
              />
              {err.value && <p class="recv-rose text-xs mb-3">{err.value}</p>}
              <button class={`w-full py-2.5 ${BTN_PRIMARY}`} onClick$={login} disabled={busy.value}>
                {busy.value ? "Signing in…" : "Sign in"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
});
