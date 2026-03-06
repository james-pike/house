import { component$, useSignal, useVisibleTask$, $, useContext } from "@builder.io/qwik";
import { PosConfigContext } from "../layout";

export default component$(() => {
  const posConfig = useContext(PosConfigContext);
  const token = useSignal("");
  const email = useSignal("");
  const password = useSignal("");
  const sessionId = useSignal("");
  const openingCash = useSignal("");
  const closingCash = useSignal("");
  const notes = useSignal("");
  const status = useSignal("");
  const loading = useSignal(false);

  // Load saved auth from localStorage on mount
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const savedToken = localStorage.getItem("pos_token");
    const savedSession = localStorage.getItem("pos_session_id");
    if (savedToken) token.value = savedToken;
    if (savedSession) sessionId.value = savedSession;
  });

  const login = $(async () => {
    loading.value = true;
    try {
      const res = await fetch(`${posConfig.backendUrl}/auth/user/emailpass`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.value,
          password: password.value,
        }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Login failed");
      const data = await res.json();
      token.value = data.token;
      localStorage.setItem("pos_token", data.token);
      status.value = "Logged in successfully";
    } catch (err: any) {
      status.value = `Login failed: ${err.message}`;
    }
    loading.value = false;
  });

  const openSession = $(async () => {
    loading.value = true;
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token.value) headers["Authorization"] = `Bearer ${token.value}`;

      const res = await fetch(`${posConfig.backendUrl}/admin/pos/sessions`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          opening_cash: Math.round(
            parseFloat(openingCash.value || "0") * 100
          ),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      sessionId.value = data.session.id;
      localStorage.setItem("pos_session_id", data.session.id);
      status.value = `Session opened: ${data.session.id}`;
    } catch (err: any) {
      status.value = `Error: ${err.message}`;
    }
    loading.value = false;
  });

  const closeSession = $(async () => {
    loading.value = true;
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token.value) headers["Authorization"] = `Bearer ${token.value}`;

      const res = await fetch(
        `${posConfig.backendUrl}/admin/pos/sessions/${sessionId.value}/close`,
        {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({
            closing_cash: Math.round(
              parseFloat(closingCash.value || "0") * 100
            ),
            notes: notes.value || undefined,
          }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      localStorage.removeItem("pos_session_id");
      sessionId.value = "";
      status.value = `Session closed. Discrepancy: ${((data.session.discrepancy || 0) / 100).toFixed(2)} CAD`;
    } catch (err: any) {
      status.value = `Error: ${err.message}`;
    }
    loading.value = false;
  });

  return (
    <div class="flex items-center justify-center h-full p-4 overflow-y-auto overflow-x-hidden">
      <div class="bg-gray-800 rounded-xl p-6 w-full max-w-lg space-y-6 min-w-0">
        <h1 class="text-xl font-bold">Register Session</h1>

        {/* Login */}
        <div class="space-y-2 bg-gray-700 p-4 rounded-lg">
          <h2 class="text-sm font-medium text-gray-300">Admin Login</h2>
          <input
            type="email"
            class="w-full bg-gray-600 text-white px-3 py-2 rounded text-sm"
            placeholder="Email"
            value={email.value}
            onInput$={(e) =>
              (email.value = (e.target as HTMLInputElement).value)
            }
          />
          <input
            type="password"
            class="w-full bg-gray-600 text-white px-3 py-2 rounded text-sm"
            placeholder="Password"
            value={password.value}
            onInput$={(e) =>
              (password.value = (e.target as HTMLInputElement).value)
            }
          />
          <button
            class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm"
            onClick$={login}
          >
            Login
          </button>
          {token.value && (
            <p class="text-xs text-green-400 break-all">
              Token: {token.value.substring(0, 30)}...
            </p>
          )}
        </div>

        {/* Open Session */}
        <div class="space-y-2 bg-gray-700 p-4 rounded-lg">
          <h2 class="text-sm font-medium text-gray-300">Open Session</h2>
          <input
            type="number"
            class="w-full bg-gray-600 text-white px-3 py-2 rounded text-sm"
            placeholder="Opening cash (e.g. 200.00)"
            value={openingCash.value}
            onInput$={(e) =>
              (openingCash.value = (e.target as HTMLInputElement).value)
            }
          />
          <button
            class="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm disabled:opacity-50"
            disabled={!token.value || loading.value}
            onClick$={openSession}
          >
            Open Register
          </button>
        </div>

        {/* Close Session */}
        {sessionId.value && (
          <div class="space-y-2 bg-gray-700 p-4 rounded-lg">
            <h2 class="text-sm font-medium text-gray-300">Close Session</h2>
            <p class="text-xs text-gray-400">
              Session: {sessionId.value}
            </p>
            <input
              type="number"
              class="w-full bg-gray-600 text-white px-3 py-2 rounded text-sm"
              placeholder="Closing cash count (e.g. 350.00)"
              value={closingCash.value}
              onInput$={(e) =>
                (closingCash.value = (e.target as HTMLInputElement).value)
              }
            />
            <input
              type="text"
              class="w-full bg-gray-600 text-white px-3 py-2 rounded text-sm"
              placeholder="Notes (optional)"
              value={notes.value}
              onInput$={(e) =>
                (notes.value = (e.target as HTMLInputElement).value)
              }
            />
            <button
              class="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm disabled:opacity-50"
              disabled={!token.value || loading.value}
              onClick$={closeSession}
            >
              Close Register
            </button>
          </div>
        )}

        {/* Status */}
        {status.value && (
          <div class="bg-gray-700 p-3 rounded-lg">
            <p class="text-sm text-yellow-300">{status.value}</p>
          </div>
        )}

        <a
          href="/pos"
          class="block text-center text-blue-400 hover:text-blue-300 text-sm"
        >
          Go to POS Terminal
        </a>
      </div>
    </div>
  );
});
