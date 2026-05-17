// import NextAuth from "next-auth"
// import CredentialsProvider from "next-auth/providers/credentials"
// import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
// import { PrismaAdapter } from "@auth/prisma-adapter"
// import { prisma } from "@/lib/prisma"
// import bcrypt from "bcryptjs"
// import { Role } from "@prisma/client"

// // Azure AD group ID → Role mapping
// // Set these in your Azure AD app registration
// const AZURE_ROLE_MAP: Record<string, Role> = {
//   [process.env.AZURE_GROUP_ADMIN   || ""]: Role.ADMIN,
//   [process.env.AZURE_GROUP_MANAGER || ""]: Role.MANAGER,
//   [process.env.AZURE_GROUP_EMPLOYEE || ""]: Role.EMPLOYEE,
// }

// export const { handlers, auth, signIn, signOut } = NextAuth({
//   adapter: PrismaAdapter(prisma),
//   session: { strategy: "jwt" },
//   pages: { signIn: "/login" },

//   providers: [
//     // ── Provider 1: Credentials (existing, always available) ──────────────────
//     CredentialsProvider({
//       name: "credentials",
//       credentials: {
//         email:    { label: "Email",    type: "email"    },
//         password: { label: "Password", type: "password" },
//       },
//       async authorize(credentials) {
//         if (!credentials?.email || !credentials?.password) return null
//         const user = await prisma.user.findUnique({
//           where: { email: credentials.email as string },
//         })
//         if (!user) return null
//         const ok = await bcrypt.compare(
//           credentials.password as string,
//           user.password
//         )
//         if (!ok) return null
//         return {
//           id:         user.id,
//           name:       user.name,
//           email:      user.email,
//           role:       user.role,
//           department: user.department,
//         }
//       },
//     }),

//     // ── Provider 2: Microsoft Entra ID (Azure AD) ─────────────────────────────
//     // Only active when AZURE_AD_CLIENT_ID is present in environment
//     ...(process.env.AZURE_AD_CLIENT_ID
//       ? [
//           MicrosoftEntraID({
//             clientId: process.env.AZURE_AD_CLIENT_ID!,
//             clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
//             tenantId: process.env.AZURE_AD_TENANT_ID || "common",
//             issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
//             authorization: {
//               params: {
//                 scope: "openid profile email User.Read",
//               },
//             },
//           } as any),
//         ]
//       : []),
//   ],

//   callbacks: {
//     async signIn({ user, account, profile }) {
//       // Only run Azure AD logic for microsoft-entra-id provider
//       if (account?.provider === "microsoft-entra-id" && profile) {
//         const email = profile.email || (profile as any).preferred_username
//         if (!email) return false

//         // Upsert user — create if first time SSO login
//         const existingUser = await prisma.user.findUnique({ where: { email } })

//         // Determine role from Azure AD group claims
//         const groups: string[] = (profile as any).groups || []
//         let role: Role = Role.EMPLOYEE
//         for (const groupId of groups) {
//           if (AZURE_ROLE_MAP[groupId]) {
//             role = AZURE_ROLE_MAP[groupId]
//             break
//           }
//         }

//         if (!existingUser) {
//           await prisma.user.create({
//             data: {
//               name:       profile.name || email,
//               email,
//               password:   "", // SSO users have no local password
//               role,
//               department: (profile as any).department || null,
//             },
//           })
//         } else {
//           // Sync role from Azure AD on every login
//           await prisma.user.update({
//             where: { email },
//             data: { role },
//           })
//         }
//         return true
//       }
//       return true
//     },

//     async jwt({ token, user, account, profile }) {
//       if (user) {
//         // Credentials login — role already on user object
//         token.role       = (user as any).role
//         token.department = (user as any).department
//         token.id         = user.id
//       }
//       if (account?.provider === "microsoft-entra-id" && profile) {
//         // Azure AD login — fetch role from DB (just synced above)
//         const email = profile.email || (profile as any).preferred_username
//         const dbUser = await prisma.user.findUnique({ where: { email } })
//         if (dbUser) {
//           token.role       = dbUser.role
//           token.department = dbUser.department
//           token.id         = dbUser.id
//         }
//       }
//       return token
//     },

//     async session({ session, token }) {
//       if (session.user) {
//         (session.user as any).role       = token.role
//         ;(session.user as any).department = token.department
//         ;(session.user as any).id         = token.id
//       }
//       return session
//     },
//   },
// })

// export const { GET, POST } = handlers

import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { Role } from "@prisma/client"

/**
 * Check whether Azure SSO is fully configured.
 * IMPORTANT:
 * Do not enable Microsoft provider if even one value is missing,
 * otherwise NextAuth throws: error=Configuration
 */
const isAzureConfigured =
  Boolean(process.env.AZURE_AD_CLIENT_ID) &&
  Boolean(process.env.AZURE_AD_CLIENT_SECRET) &&
  Boolean(process.env.AZURE_AD_TENANT_ID)

/**
 * Build Microsoft Entra issuer URL.
 * For single-tenant Azure app registration, issuer must use your Directory/Tenant ID.
 */
const azureIssuer = process.env.AZURE_AD_TENANT_ID
  ? `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`
  : undefined

/**
 * Safely map Azure group object IDs to app roles.
 */
function getRoleFromAzureGroups(groups: unknown): Role {
  const groupList = Array.isArray(groups) ? groups : []

  if (
    process.env.AZURE_GROUP_ADMIN &&
    groupList.includes(process.env.AZURE_GROUP_ADMIN)
  ) {
    return Role.ADMIN
  }

  if (
    process.env.AZURE_GROUP_MANAGER &&
    groupList.includes(process.env.AZURE_GROUP_MANAGER)
  ) {
    return Role.MANAGER
  }

  if (
    process.env.AZURE_GROUP_EMPLOYEE &&
    groupList.includes(process.env.AZURE_GROUP_EMPLOYEE)
  ) {
    return Role.EMPLOYEE
  }

  // Safe fallback for users without matching Azure group
  return Role.EMPLOYEE
}

/**
 * Safely get email from Microsoft profile.
 * Microsoft may return email or preferred_username depending on tenant/account settings.
 */
function getEmailFromAzureProfile(profile: any): string | null {
  return profile?.email || profile?.preferred_username || null
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  /**
   * You are using JWT sessions.
   * This is fine with PrismaAdapter if your app only needs role/id in token.
   */
  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    /**
     * Existing email/password login
     */
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = String(credentials.email)
        const password = String(credentials.password)

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user) {
          return null
        }

        /**
         * Important fix:
         * SSO users may not have a local password.
         * So never call bcrypt.compare if password is empty/null.
         */
        if (!user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
        }
      },
    }),

    /**
     * Microsoft Entra ID login
     * Only enabled when ALL Azure env variables are available.
     */
    ...(isAzureConfigured && azureIssuer
      ? [
          MicrosoftEntraID({
            clientId: process.env.AZURE_AD_CLIENT_ID!,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            issuer: azureIssuer,
            // authorization: {
            //   params: {
            //     scope: "openid profile email",
            //   },
            // },
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],

  callbacks: {
    async signIn({ account, profile }) {
      /**
       * Only run this logic for Microsoft Entra ID login.
       */
      if (account?.provider !== "microsoft-entra-id") {
        return true
      }

      const email = getEmailFromAzureProfile(profile)

      if (!email) {
        console.error("Microsoft login failed: email not found in profile")
        return false
      }

      const role = getRoleFromAzureGroups((profile as any)?.groups)

      /**
       * Upsert user on every Microsoft login.
       * This keeps the user's app role synced with Azure group membership.
       *
       * NOTE:
       * password should be optional in Prisma schema:
       * password String?
       */
      await prisma.user.upsert({
        where: { email },
        update: {
          name: (profile as any)?.name || email,
          role,
          department: (profile as any)?.department || null,
        },
        create: {
          name: (profile as any)?.name || email,
          email,
          password: "",
          role,
          department: (profile as any)?.department || null,
        },
      })

      return true
    },

    async jwt({ token, user, account, profile }) {
      /**
       * Credentials login:
       * user object comes from authorize()
       */
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.department = (user as any).department
      }

      /**
       * Microsoft login:
       * fetch user after signIn() has synced the DB.
       */
      if (account?.provider === "microsoft-entra-id") {
        const email = getEmailFromAzureProfile(profile)

        if (email) {
          const dbUser = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              role: true,
              department: true,
            },
          })

          if (dbUser) {
            token.id = dbUser.id
            token.role = dbUser.role
            token.department = dbUser.department
          }
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).role = token.role
        ;(session.user as any).department = token.department
      }

      return session
    },
  },
})

export const { GET, POST } = handlers