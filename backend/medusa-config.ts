import { loadEnv, defineConfig } from '@medusajs/framework/utils'

// Load environment variables for current mode
loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Origins that must always be allowed, regardless of env config.
// Guarantees the POS (Vercel) and storefront can reach the API even if
// the AUTH_CORS/ADMIN_CORS/STORE_CORS env vars are unset on the host.
const REQUIRED_ORIGINS = [
  "https://safety-b8tq.vercel.app",
  "https://house-6ml.pages.dev",
  "http://localhost:5173",
  "http://localhost:8000",
].join(",")

const withRequired = (envVal?: string) =>
  [envVal, REQUIRED_ORIGINS].filter(Boolean).join(",")

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: withRequired(process.env.STORE_CORS),
      adminCors: withRequired(process.env.ADMIN_CORS),
      authCors: withRequired(process.env.AUTH_CORS),
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  admin: {
    disable: process.env.NODE_ENV === "production",
  },
  modules: [
    {
      resolve: "./src/modules/pos",
    },
  ],
})
