import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { GoalStatus } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart2 } from "lucide-react"
import {
  Users, Target, CheckCircle, Clock,
  TrendingUp, FileSpreadsheet, ScrollText,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function AdminDashboardPage() {
  await requireAuth(["ADMIN"])

  const [
    totalUsers,
    totalGoals,
    lockedGoals,
    submittedGoals,
    totalCheckins,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.user.count({ where: { role: { not: "ADMIN" } } }),
    prisma.goal.count(),
    prisma.goal.count({ where: { status: GoalStatus.LOCKED } }),
    prisma.goal.count({ where: { status: GoalStatus.SUBMITTED } }),
    prisma.checkin.count(),
    prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        goal: { select: { title: true } },
        changedBy: { select: { name: true } },
      },
    }),
  ])

  const approvalRate =
    totalGoals > 0 ? Math.round((lockedGoals / totalGoals) * 100) : 0
  const checkinRate =
    lockedGoals > 0
      ? Math.round((totalCheckins / (lockedGoals * 4)) * 100)
      : 0

  const stats = [
    { label: "Total Users",       value: totalUsers,    icon: Users,        color: "text-blue-600"   },
    { label: "Total Goals",       value: totalGoals,    icon: Target,       color: "text-slate-600"  },
    { label: "Approved & Locked", value: lockedGoals,   icon: CheckCircle,  color: "text-green-600"  },
    { label: "Pending Approval",  value: submittedGoals,icon: Clock,        color: "text-amber-600"  },
    { label: "Check-ins Logged",  value: totalCheckins, icon: TrendingUp,   color: "text-purple-600" },
    { label: "Approval Rate",     value: `${approvalRate}%`, icon: CheckCircle, color: "text-green-600" },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1 text-sm">2025-26 Annual Cycle · Full organization view</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
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

      {/* Check-in completion bar */}
      <Card className="mb-6">
        <CardContent className="pt-5 pb-5">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-slate-700">
              Organisation Check-in Completion Rate
            </p>
            <span className="text-sm font-semibold text-slate-900">{checkinRate}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${
                checkinRate >= 80
                  ? "bg-green-500"
                  : checkinRate >= 50
                  ? "bg-amber-500"
                  : "bg-red-400"
              }`}
              style={{ width: `${Math.min(checkinRate, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            Based on {totalCheckins} check-ins across {lockedGoals} approved goals (4 quarters each)
          </p>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Link href="/admin/reports">
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <BarChart2 size={20} className="text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">View Reports</p>
                  <p className="text-xs text-slate-400">Completion dashboard</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/export">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <FileSpreadsheet size={20} className="text-green-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Export Data</p>
                  <p className="text-xs text-slate-400">Download Excel report</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/audit">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <ScrollText size={20} className="text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Audit Trail</p>
                  <p className="text-xs text-slate-400">Full change history</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Audit Activity */}
      {recentAuditLogs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-700">
                Recent Activity
              </CardTitle>
              <Link href="/admin/audit">
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  View all
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {recentAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0"
                >
                  <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    <ScrollText size={12} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800">
                      <span className="font-medium">{log.changedBy.name}</span>{" "}
                      changed{" "}
                      <span className="font-medium text-slate-600">{log.field}</span>
                      {" "}on{" "}
                      <span className="font-medium">{log.goal.title}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(log.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="text-xs text-slate-400 shrink-0">
                    {log.oldValue} → {log.newValue}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}