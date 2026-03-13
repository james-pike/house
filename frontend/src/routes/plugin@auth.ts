import type { RequestHandler } from "@builder.io/qwik-city";

const USERNAME = "admin";
const PASSWORD = "SafetyHouse";
const COOKIE_NAME = "sh_auth";
const TOKEN = btoa(`${USERNAME}:${PASSWORD}`);

const LOGIN_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Login</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#121212;color:#fff}
.card{width:100%;max-width:360px;padding:2.5rem 2rem;margin:1rem;text-align:center}
h1{font-size:1.4rem;font-weight:700;margin-bottom:0.25rem}
.sub{color:rgba(255,255,255,0.45);font-size:0.85rem;margin-bottom:2rem}
form{display:flex;flex-direction:column;gap:0.75rem}
label{text-align:left;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.4);font-weight:600}
input{width:100%;padding:0.65rem 0.85rem;border:1px solid rgba(255,255,255,0.12);border-radius:6px;background:rgba(255,255,255,0.06);color:#fff;font-size:0.95rem;outline:none;transition:border-color 0.2s}
input:focus{border-color:#e6a817}
button{margin-top:0.5rem;padding:0.7rem;border:none;border-radius:6px;background:#e6a817;color:#fff;font-size:0.95rem;font-weight:600;cursor:pointer;transition:background 0.2s}
button:hover{background:#c99215}
.err{color:#f87171;font-size:0.8rem;margin-top:0.5rem;min-height:1.2em}
</style>
</head>
<body>
<div class="card">
  <h1>Login</h1>
  <p class="sub">Enter your credentials to continue.</p>
  <form method="POST" action="/__auth">
    <div>
      <label for="user">Username</label>
      <input id="user" name="user" type="text" value="admin" autocomplete="username" />
    </div>
    <div>
      <label for="pass">Password</label>
      <input id="pass" name="pass" type="password" placeholder="Enter password" autocomplete="current-password" autofocus />
    </div>
    <button type="submit">Sign In</button>
    <p class="err">ERROR_PLACEHOLDER</p>
  </form>
</div>
</body>
</html>`;

export const onRequest: RequestHandler = async ({ request, url, send, cookie }) => {
  // Handle login form submission
  if (request.method === "POST" && url.pathname === "/__auth") {
    const form = await request.formData();
    const user = form.get("user")?.toString() || "";
    const pass = form.get("pass")?.toString() || "";

    if (user === USERNAME && pass === PASSWORD) {
      cookie.set(COOKIE_NAME, TOKEN, {
        path: "/",
        httpOnly: true,
        secure: url.protocol === "https:",
        sameSite: "lax",
        maxAge: [7, "days"],
      });
      // Redirect to home after login
      send(new Response(null, {
        status: 302,
        headers: { Location: "/" },
      }));
      return;
    }

    // Wrong password — show form with error
    send(new Response(
      LOGIN_PAGE.replace("ERROR_PLACEHOLDER", "Invalid username or password."),
      { status: 401, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
    ));
    return;
  }

  // Check auth cookie
  const authCookie = cookie.get(COOKIE_NAME)?.value;
  if (authCookie === TOKEN) {
    return; // Authenticated
  }

  // Show login page (no error message)
  if (url.pathname === "/__auth" && request.method === "GET") {
    send(new Response(
      LOGIN_PAGE.replace('<p class="err">ERROR_PLACEHOLDER</p>', ''),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
    ));
    return;
  }

  // Redirect to login
  send(new Response(
    LOGIN_PAGE.replace('<p class="err">ERROR_PLACEHOLDER</p>', ''),
    { status: 401, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  ));
};
