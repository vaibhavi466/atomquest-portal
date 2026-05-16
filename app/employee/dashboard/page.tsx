import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { GoalStatus } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Target, CheckCircle, Clock, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function EmployeeDashboardPage() {
  const session = await requireAuth(["EMPLOYEE"])
  const userId = (session.user as any).id

  const goals = await prisma.goal.findMany({
    where: { userId },
    include: { checkins: true },
  })

  const totalWeightage = goals.reduce((s, g) => s + g.weightage, 0)
  const lockedGoals = goals.filter((g) => g.status === GoalStatus.LOCKED)
  const submittedGoals = goals.filter((g) => g.status === GoalStatus.SUBMITTED)
  const draftGoals = goals.filter(
    (g) => g.status === GoalStatus.DRAFT || g.status === GoalStatus.RETURNED
  )

  const stats = [
    { label: "Total Goals", value: goals.length, icon: Target, color: "text-blue-600" },
    { label: "Approved & Locked", value: lockedGoals.length, icon: CheckCircle, color: "text-green-600" },
    { label: "Pending Approval", value: submittedGoals.length, icon: Clock, color: "text-amber-600" },
    { label: "Drafts / Returned", value: draftGoals.length, icon: AlertCircle, color: "text-slate-500" },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome back, {(session.user as any)?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-slate-500 mt-1">2025-26 Annual Cycle</p>
      </div>

      {/* Stats */}
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

      {/* Weightage Bar */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-700">
            Weightage Allocation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  Math.abs(totalWeightage - 100) < 0.01
                    ? "bg-green-500"
                    : totalWeightage > 100
                    ? "bg-red-500"
                    : "bg-amber-500"
                }`}
                style={{ width: `${Math.min(totalWeightage, 100)}%` }}
              />
            </div>
            <span
              className={`text-sm font-medium tabular-nums ${
                Math.abs(totalWeightage - 100) < 0.01
                  ? "text-green-600"
                  : totalWeightage > 100
                  ? "text-red-600"
                  : "text-amber-600"
              }`}
            >
              {totalWeightage.toFixed(1)}% / 100%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {Math.abs(totalWeightage - 100) < 0.01
              ? "✓ Weightage balanced — ready to submit"
              : totalWeightage < 100
              ? `${(100 - totalWeightage).toFixed(1)}% remaining to allocate`
              : `${(totalWeightage - 100).toFixed(1)}% over limit — reduce before submitting`}
          </p>
        </CardContent>
      </Card>

      {/* CTA */}
      {draftGoals.length > 0 && (
        <div className="flex gap-3">
          <Link href="/employee/goals">
            <Button size="sm">Manage Goals</Button>
          </Link>
        </div>
      )}

      {goals.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Target size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No goals yet</p>
            <p className="text-slate-400 text-sm mt-1">Start by adding your first goal for this cycle</p>
            <Link href="/employee/goals" className="mt-4 inline-block">
              <Button size="sm">Add First Goal</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}