import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email || !password) {
    return res.status(400).json({ message: "email and password required" })
  }

  const userService = req.scope.resolve(Modules.USER)
  const authService = req.scope.resolve(Modules.AUTH)
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

  // Only allow if no admin users exist (one-time setup)
  const existingUsers = await userService.listUsers({})
  if (existingUsers.length > 0) {
    return res.status(403).json({ message: "Admin user already exists. Setup is locked." })
  }

  // Create auth identity with emailpass provider
  const authIdentity = await authService.createAuthIdentities({
    provider_identities: [
      {
        provider: "emailpass",
        entity_id: email,
        provider_metadata: { password },
      },
    ],
  })

  // Create user
  const user = await userService.createUsers({ email })

  // Link auth identity to user
  await link.create({
    [Modules.AUTH]: { auth_identity_id: authIdentity.id },
    [Modules.USER]: { user_id: user.id },
  })

  res.status(201).json({
    message: "Admin user created",
    user: { id: user.id, email },
  })
}
