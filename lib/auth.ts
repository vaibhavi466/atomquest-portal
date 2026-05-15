import { auth } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"

export async function getSession() {
  const session = await auth()
  return session
}

export async function requireAuth(allowedRoles?: string[]) {
  const session = await auth()
  if (!session) redirect("/login")
  if (allowedRoles && !allowedRoles.includes((session.user as any).role)) {
    redirect("/unauthorized")
  }
  return session
}