import { defineMiddlewares } from "@medusajs/medusa"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/pos/*",
      method: ["GET", "POST"],
      bodyParser: { sizeLimit: "1mb" },
    },
  ],
})
