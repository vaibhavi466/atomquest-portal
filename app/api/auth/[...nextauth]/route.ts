// import NextAuth from "next-auth"
// import CredentialsProvider from "next-auth/providers/credentials"
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
//   pages: {
//     signIn: "/login",
//   },
//   providers: [
// // ── Provider 1: Credentials (existing, always available) ──────────────────
//     CredentialsProvider({
//       name: "credentials",
//       credentials: {
//         email: { label: "Email", type: "email" },
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
//           id: user.id,
//           name: user.name,
//           email: user.email,
//           role: user.role,
//           department: user.department,
//         }
//       },
//     }),
// // ── Provider 2: Azure AD (optional, only if env vars are set) ─────────────
//     ...(process.env.AZURE_CLIENT_ID ? [
//         MicrosoftEntraID({
//             clientId:     process.env.AZURE_AD_CLIENT_ID!,
//             clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
//             tenantId:     process.env.AZURE_AD_TENANT_ID!,
//             authorization: {
//               params: {
//                 scope: "openid profile email User.Read",
//               },
//             },
//           }),
//         ]
//       : []),
//   ],
//   callbacks: {
//     async jwt({ token, user, account, profile }){
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

//         if (!passwordMatch) return null

//         return {
//           id: user.id,
//           name: user.name,
//           email: user.email,
//           role: user.role,
//           department: user.department,
//         }
//       },
//     }),
// // ── Provider 2: Azure AD (optional, only if env vars are set) ─────────────
//     ...(process.env.AZURE_CLIENT_ID ? [
//         MicrosoftEntraID({
//             clientId:     process.env.AZURE_AD_CLIENT_ID!,
//             clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
//             tenantId:     process.env.AZURE_AD_TENANT_ID!,
//             authorization: {
//               params: {
//                 scope: "openid profile email User.Read",
//               },
//             },
//           }),
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
//       }
//       return true
//     },
//     async jwt({ token, user, account, profile }){
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

// export const { GET, POST } = 

import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { Role } from "@prisma/client"

// Azure AD group ID → Role mapping
// Set these in your Azure AD app registration
const AZURE_ROLE_MAP: Record<string, Role> = {
  [process.env.AZURE_GROUP_ADMIN   || ""]: Role.ADMIN,
  [process.env.AZURE_GROUP_MANAGER || ""]: Role.MANAGER,
  [process.env.AZURE_GROUP_EMPLOYEE || ""]: Role.EMPLOYEE,
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },

  providers: [
    // ── Provider 1: Credentials (existing, always available) ──────────────────
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user) return null
        const ok = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        if (!ok) return null
        return {
          id:         user.id,
          name:       user.name,
          email:      user.email,
          role:       user.role,
          department: user.department,
        }
      },
    }),

    // ── Provider 2: Microsoft Entra ID (Azure AD) ─────────────────────────────
    // Only active when AZURE_AD_CLIENT_ID is present in environment
    ...(process.env.AZURE_AD_CLIENT_ID
      ? [
          MicrosoftEntraID({
            clientId:     process.env.AZURE_AD_CLIENT_ID!,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            authorization: {
              params: {
                scope: "openid profile email User.Read",
                tenantId:     process.env.AZURE_AD_TENANT_ID!,
              },
            },
          }),
        ]
      : []),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      // Only run Azure AD logic for microsoft-entra-id provider
      if (account?.provider === "microsoft-entra-id" && profile) {
        const email = profile.email || (profile as any).preferred_username
        if (!email) return false

        // Upsert user — create if first time SSO login
        const existingUser = await prisma.user.findUnique({ where: { email } })

        // Determine role from Azure AD group claims
        const groups: string[] = (profile as any).groups || []
        let role: Role = Role.EMPLOYEE
        for (const groupId of groups) {
          if (AZURE_ROLE_MAP[groupId]) {
            role = AZURE_ROLE_MAP[groupId]
            break
          }
        }

        if (!existingUser) {
          await prisma.user.create({
            data: {
              name:       profile.name || email,
              email,
              password:   "", // SSO users have no local password
              role,
              department: (profile as any).department || null,
            },
          })
        } else {
          // Sync role from Azure AD on every login
          await prisma.user.update({
            where: { email },
            data: { role },
          })
        }
        return true
      }
      return true
    },

    async jwt({ token, user, account, profile }) {
      if (user) {
        // Credentials login — role already on user object
        token.role       = (user as any).role
        token.department = (user as any).department
        token.id         = user.id
      }
      if (account?.provider === "microsoft-entra-id" && profile) {
        // Azure AD login — fetch role from DB (just synced above)
        const email = profile.email || (profile as any).preferred_username
        const dbUser = await prisma.user.findUnique({ where: { email } })
        if (dbUser) {
          token.role       = dbUser.role
          token.department = dbUser.department
          token.id         = dbUser.id
        }
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role       = token.role
        ;(session.user as any).department = token.department
        ;(session.user as any).id         = token.id
      }
      return session
    },
  },
})

export const { GET, POST } = handlers