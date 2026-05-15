import { redirect } from "next/navigation"
import { auth } from "@/app/api/auth/[...nextauth]/route"

export default async function RootPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const role = (session.user as any)?.role
  if (role === "ADMIN") redirect("/admin/dashboard")
  if (role === "MANAGER") redirect("/manager/dashboard")
  redirect("/employee/dashboard")
}