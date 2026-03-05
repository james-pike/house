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

  // Check for existing auth identity for this email
  let authIdentity: any = null
  const existingIdentities = await authService.listAuthIdentities({
    provider_identities: { entity_id: email },
  })
  authIdentity = existingIdentities[0] || null

  // If no auth identity, create one
  if (!authIdentity) {
    authIdentity = await authService.createAuthIdentities({
      provider_identities: [
        {
          provider: "emailpass",
          entity_id: email,
          provider_metadata: { password },
        },
      ],
    })
  }

  // Check for existing user
  let user: any = null
  const existingUsers = await userService.listUsers({ email })
  user = existingUsers[0] || null

  // If no user, try to find any user to link to (from seed)
  if (!user) {
    const allUsers = await userService.listUsers({})
    if (allUsers.length > 0) {
      // Update the first user's email to match
      user = allUsers[0]
      await userService.updateUsers({ id: user.id, email })
    } else {
      // Create new user
      user = await userService.createUsers({ email })
    }
  }

  // Link auth identity to user (ignore if already linked)
  try {
    await link.create({
      [Modules.AUTH]: { auth_identity_id: authIdentity.id },
      [Modules.USER]: { user_id: user.id },
    })
  } catch {
    // Link may already exist
  }

  res.status(201).json({
    message: "Admin user set up",
    user: { id: user.id, email },
    auth_identity_id: authIdentity.id,
  })
}
