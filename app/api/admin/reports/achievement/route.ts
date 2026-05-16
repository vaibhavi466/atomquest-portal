import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { GoalStatus } from "@prisma/client"
import { calculateScore, calculateOverallScore } from "@/lib/calculations"

// GET /api/admin/reports/achievement
// Returns full achievement data for all employees — used for display + CSV export
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as any).role
  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const managerId = (session.user as any).id

  // Admin sees all users; manager sees only direct reports
  const whereClause =
    role === "ADMIN" ? {} : { managerId }

  const users = await prisma.user.findMany({
    where: {
      ...whereClause,
      role: { in: ["EMPLOYEE", "MANAGER"] },
    },
    include: {
      manager: { select: { name: true } },
      goals: {
        include: {
          checkins: { orderBy: { quarter: "asc" } },
        },
      },
    },
    orderBy: { name: "asc" },
  })

  // Build structured report rows
  const report = users.map((user) => {
    const goalRows = user.goals.map((goal) => {
      const checkinMap: Record<string, any> = {}
      goal.checkins.forEach((c) => {
        checkinMap[c.quarter] = c
      })

      const quarterScores = ["Q1", "Q2", "Q3", "Q4"].map((q) => {
        const c = checkinMap[q]
        return {
          quarter: q,
          actual: c?.actual ?? null,
          score: c?.score ?? null,
          status: c?.status ?? "NOT_STARTED",
          managerComment: c?.managerComment ?? null,
        }
      })

      const scored = quarterScores.filter((q) => q.score !== null)
      const avgScore =
        scored.length > 0
          ? scored.reduce((s, q) => s + (q.score as number), 0) / scored.length
          : 0

      return {
        goalId: goal.id,
        thrustArea: goal.thrustArea,
        title: goal.title,
        uomType: goal.uomType,
        target: goal.target,
        weightage: goal.weightage,
        status: goal.status,
        isShared: goal.isShared,
        quarters: quarterScores,
        avgScore: Math.round(avgScore * 10) / 10,
        weightedScore: Math.round((avgScore * goal.weightage) / 100 * 10) / 10,
      }
    })

    const overallScore = calculateOverallScore(
      goalRows.map((g) => ({ score: g.avgScore, weightage: g.weightage }))
    )

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      department: user.department || "N/A",
      managerName: user.manager?.name || "N/A",
      totalGoals: user.goals.length,
      lockedGoals: user.goals.filter((g) => g.status === GoalStatus.LOCKED).length,
      overallScore,
      goals: goalRows,
    }
  })

  return NextResponse.json(report)
}