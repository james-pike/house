import type { RequestHandler } from "@builder.io/qwik-city";

// Same-origin proxy to the Medusa backend.
//
// The POS runs in the browser and would otherwise call the Render backend
// cross-origin, which requires the backend's CORS env vars to allow this
// origin. By routing browser calls through `/api/*` on the POS's own domain
// and forwarding them server-side, there is no cross-origin request and CORS
// never applies — so the POS works regardless of the backend's CORS config.
const proxy: RequestHandler = async (event) => {
  const backend =
    event.env.get("MEDUSA_BACKEND_URL") || "http://localhost:9000";
  const pubKey = event.env.get("MEDUSA_PUBLISHABLE_KEY") || "";
  const path = event.params.path ?? "";
  const target = `${backend}/${path}${event.url.search}`;

  const headers = new Headers();
  const auth = event.request.headers.get("authorization");
  if (auth) headers.set("authorization", auth);
  const contentType = event.request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  // Store endpoints require the publishable key; admin/auth ignore it.
  if (pubKey) headers.set("x-publishable-api-key", pubKey);

  const method = event.request.method;
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await event.request.arrayBuffer() : undefined;

  // Don't follow redirects server-side — pass them to the browser instead, so
  // flows like the QuickBooks OAuth `/quickbooks/connect` → Intuit redirect work.
  const res = await fetch(target, { method, headers, body, redirect: "manual" });
  const location = res.headers.get("location");
  if (location && res.status >= 300 && res.status < 400) {
    event.send(new Response(null, { status: res.status, headers: { location } }));
    return;
  }
  const payload = await res.arrayBuffer();
  const resContentType =
    res.headers.get("content-type") || "application/json";

  event.send(
    new Response(payload, {
      status: res.status,
      headers: { "content-type": resContentType },
    })
  );
};

export const onRequest: RequestHandler = proxy;
