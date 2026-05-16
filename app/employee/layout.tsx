import { requireAuth } from "@/lib/auth"
import { EmployeeSidebar } from "@/components/employee/EmployeeSidebar"

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth(["EMPLOYEE"])

  return (
    <div className="flex h-screen bg-slate-50">
      <EmployeeSidebar user={session.user as any} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}