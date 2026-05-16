import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { GoalStatus } from "@prisma/client"
import { Card, CardContent } from "@/components/ui/card"
import { Users, CheckCircle, Clock, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function ManagerDashboardPage() {
  const session = await requireAuth(["MANAGER", "ADMIN"])
  const managerId = (session.user as any).id

  const reports = await prisma.user.findMany({
    where: { managerId },
    include: {
      goals: { select: { status: true } },
    },
  })

  const allGoals = reports.flatMap((r) => r.goals)
  const pending = allGoals.filter((g) => g.status === GoalStatus.SUBMITTED)
  const locked = allGoals.filter((g) => g.status === GoalStatus.LOCKED)
  const drafts = allGoals.filter((g) => g.status === GoalStatus.DRAFT || g.status === GoalStatus.RETURNED)

  const stats = [
    { label: "Direct Reports", value: reports.length, icon: Users, color: "text-blue-600" },
    { label: "Pending Approval", value: pending.length, icon: Clock, color: "text-amber-600" },
    { label: "Goals Approved", value: locked.length, icon: CheckCircle, color: "text-green-600" },
    { label: "In Draft", value: drafts.length, icon: AlertCircle, color: "text-slate-500" },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Manager Dashboard
        </h1>
        <p className="text-slate-500 mt-1">
          {reports.length} direct report{reports.length !== 1 ? "s" : ""} · 2025-26 Annual Cycle
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
                </div>
                <Icon size={20} className={color} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {pending.length} goal{pending.length !== 1 ? "s" : ""} waiting for your approval
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Review and approve or return goals from your team
            </p>
          </div>
          <Link href="/manager/team">
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
              Review Now
            </Button>
          </Link>
        </div>
      )}

      {reports.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
          <Users size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No direct reports assigned yet</p>
          <p className="text-slate-400 text-sm mt-1">Contact admin to assign employees to your team</p>
        </div>
      )}
    </div>
  )
}