import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

export default async function createAdmin({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const userService = container.resolve(Modules.USER)
  const authService = container.resolve(Modules.AUTH)

  const email = process.env.ADMIN_EMAIL || "admin@safetyhouse.ca"
  const password = process.env.ADMIN_PASSWORD || "admin123"

  // Check if user already exists
  const existing = await userService.listUsers({ email })
  if (existing.length > 0) {
    logger.info(`Admin user ${email} already exists (${existing[0].id})`)
    return
  }

  // Create auth identity
  const authIdentity = await authService.createAuthIdentities({
    provider_identities: [
      {
        provider: "emailpass",
        entity_id: email,
        provider_metadata: { password },
      },
    ],
  })

  // Create user linked to auth identity
  const user = await userService.createUsers({
    email,
  })

  // Link auth identity to user
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  await link.create({
    [Modules.AUTH]: { auth_identity_id: authIdentity.id },
    [Modules.USER]: { user_id: user.id },
  })

  logger.info(`Admin user created: ${email} / ${password}`)
  logger.info(`User ID: ${user.id}`)
  logger.info(`Auth Identity ID: ${authIdentity.id}`)
}
