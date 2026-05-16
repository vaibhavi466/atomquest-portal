import { requireAuth } from "@/lib/auth"
import { ManagerSidebar } from "@/components/manager/ManagerSidebar"

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth(["MANAGER", "ADMIN"])

  return (
    <div className="flex h-screen bg-slate-50">
      <ManagerSidebar user={session.user as any} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}