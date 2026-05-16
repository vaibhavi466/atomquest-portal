import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { GoalStatus } from "@prisma/client"

// GET /api/admin/reports/completion
// Real-time completion dashboard data
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as any).role
  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const managerId = (session.user as any).id
  const whereClause = role === "ADMIN" ? {} : { managerId }

  const [totalUsers, totalGoals, lockedGoals, submittedGoals, totalCheckins] =
    await Promise.all([
      prisma.user.count({ where: { ...whereClause, role: "EMPLOYEE" } }),
      prisma.goal.count({
        where: {
          user: whereClause,
        },
      }),
      prisma.goal.count({
        where: { status: GoalStatus.LOCKED, user: whereClause },
      }),
      prisma.goal.count({
        where: { status: GoalStatus.SUBMITTED, user: whereClause },
      }),
      prisma.checkin.count({
        where: { goal: { user: whereClause } },
      }),
    ])

  // Department breakdown
  const deptBreakdown = await prisma.user.groupBy({
    by: ["department"],
    where: { ...whereClause, role: "EMPLOYEE" },
    _count: { id: true },
  })

  // Goals by status for chart
  const goalsByStatus = await prisma.goal.groupBy({
    by: ["status"],
    where: { user: whereClause },
    _count: { id: true },
  })

  // Checkins by quarter
  const checkinsByQuarter = await prisma.checkin.groupBy({
    by: ["quarter"],
    where: { goal: { user: whereClause } },
    _count: { id: true },
    _avg: { score: true },
  })

  return NextResponse.json({
    summary: {
      totalUsers,
      totalGoals,
      lockedGoals,
      submittedGoals,
      totalCheckins,
      approvalRate:
        totalGoals > 0 ? Math.round((lockedGoals / totalGoals) * 100) : 0,
      checkinRate:
        lockedGoals > 0
          ? Math.round((totalCheckins / (lockedGoals * 4)) * 100)
          : 0,
    },
    deptBreakdown: deptBreakdown.map((d) => ({
      department: d.department || "Unknown",
      count: d._count.id,
    })),
    goalsByStatus: goalsByStatus.map((g) => ({
      status: g.status,
      count: g._count.id,
    })),
    checkinsByQuarter: checkinsByQuarter.map((c) => ({
      quarter: c.quarter,
      count: c._count.id,
      avgScore: Math.round((c._avg.score || 0) * 10) / 10,
    })),
  })
}