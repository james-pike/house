import type { RequestHandler } from "@builder.io/qwik-city";

const USERNAME = "admin";
const PASSWORD = "SafetyHouse";

export const onRequest: RequestHandler = async ({ request, send }) => {

  const auth = request.headers.get("authorization");

  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const [user, pass] = decoded.split(":");
      if (user === USERNAME && pass === PASSWORD) {
        return;
      }
    }
  }

  send(
    new Response(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Login Required</title><style>*{margin:0;padding:0}body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#121212;color:#fff;text-align:center}h1{font-size:1.5rem;font-weight:700;margin-bottom:0.5rem}p{color:rgba(255,255,255,0.5);font-size:0.9rem}</style></head><body><div><h1>The Safety House</h1><p>Please log in to continue.</p></div></body></html>',
      {
        status: 401,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "WWW-Authenticate": 'Basic realm="The Safety House"',
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    ),
  );
};
