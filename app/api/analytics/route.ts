import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { GoalStatus } from "@prisma/client"
import { calculateOverallScore } from "@/lib/calculations"

// GET /api/analytics
// Returns all analytics data in a single call — QoQ trends, thrust areas,
// score distribution, team leaderboard, checkin completion heatmap
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as any).role
  const managerId = (session.user as any).id

  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const whereClause = role === "ADMIN" ? {} : { managerId }

  // ─── Fetch base data ────────────────────────────────────────────────────────
  const users = await prisma.user.findMany({
    where: { ...whereClause, role: { in: ["EMPLOYEE", "MANAGER"] } },
    include: {
      goals: {
        where: { status: GoalStatus.LOCKED },
        include: { checkins: { orderBy: { quarter: "asc" } } },
      },
    },
  })

  // ─── 1. QoQ Trend: avg score per quarter across all employees ───────────────
  const quarters = ["Q1", "Q2", "Q3", "Q4", "ANNUAL"]
  const qoqTrend = quarters.map((q) => {
    const scores: number[] = []
    users.forEach((user) => {
      user.goals.forEach((goal) => {
        const checkin = goal.checkins.find((c) => c.quarter === q)
        if (checkin?.score !== null && checkin?.score !== undefined) {
          scores.push(checkin.score)
        }
      })
    })
    const avg =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : 0
    return { quarter: q, avgScore: avg, checkinsLogged: scores.length }
  })

  // ─── 2. Thrust Area Breakdown: avg score + count per thrust area ────────────
  const thrustMap: Record<string, { scores: number[]; count: number }> = {}
  users.forEach((user) => {
    user.goals.forEach((goal) => {
      if (!thrustMap[goal.thrustArea]) {
        thrustMap[goal.thrustArea] = { scores: [], count: 0 }
      }
      thrustMap[goal.thrustArea].count++
      const goalScores = goal.checkins
        .filter((c) => c.score !== null)
        .map((c) => c.score as number)
      if (goalScores.length > 0) {
        const avg = goalScores.reduce((a, b) => a + b, 0) / goalScores.length
        thrustMap[goal.thrustArea].scores.push(avg)
      }
    })
  })

  const thrustBreakdown = Object.entries(thrustMap)
    .map(([area, data]) => ({
      thrustArea: area,
      goalCount: data.count,
      avgScore:
        data.scores.length > 0
          ? Math.round(
              (data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 10
            ) / 10
          : 0,
    }))
    .sort((a, b) => b.goalCount - a.goalCount)

  // ─── 3. Score Distribution: how many employees fall in each band ────────────
  const bands = [
    { label: "0–25%",   min: 0,   max: 25  },
    { label: "26–50%",  min: 26,  max: 50  },
    { label: "51–75%",  min: 51,  max: 75  },
    { label: "76–100%", min: 76,  max: 100 },
  ]

  const employeeScores = users.map((user) => {
    const overall = calculateOverallScore(
      user.goals.map((g) => {
        const scored = g.checkins.filter((c) => c.score !== null)
        const avg =
          scored.length > 0
            ? scored.reduce((s, c) => s + (c.score as number), 0) / scored.length
            : 0
        return { score: avg, weightage: g.weightage }
      })
    )
    return { name: user.name, score: overall }
  })

  const scoreDistribution = bands.map((band) => ({
    band: band.label,
    count: employeeScores.filter(
      (e) => e.score >= band.min && e.score <= band.max
    ).length,
  }))

  // ─── 4. Team Leaderboard: top employees by overall score ────────────────────
  const leaderboard = employeeScores
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  // ─── 5. Check-in Completion Heatmap data: per employee per quarter ──────────
  const heatmap = users.map((user) => {
    const quarterData: Record<string, number | null> = {}
    quarters.forEach((q) => {
      const qCheckins: number[] = []
      user.goals.forEach((goal) => {
        const c = goal.checkins.find((ci) => ci.quarter === q)
        if (c?.score !== null && c?.score !== undefined) {
          qCheckins.push(c.score)
        }
      })
      quarterData[q] =
        qCheckins.length > 0
          ? Math.round(
              (qCheckins.reduce((a, b) => a + b, 0) / qCheckins.length) * 10
            ) / 10
          : null
    })
    return {
      name: user.name.split(" ")[0], // First name only for chart readability
      ...quarterData,
    }
  })

  // ─── 6. UoM Type Distribution ────────────────────────────────────────────────
  const uomMap: Record<string, number> = {}
  users.forEach((user) => {
    user.goals.forEach((goal) => {
      uomMap[goal.uomType] = (uomMap[goal.uomType] || 0) + 1
    })
  })

  const uomDistribution = Object.entries(uomMap).map(([type, count]) => ({
    type,
    count,
    label:
      type === "MIN" ? "Minimize"
      : type === "MAX" ? "Maximize"
      : type === "ZERO" ? "Zero Target"
      : "Timeline",
  }))

  // ─── 7. Manager Effectiveness Dashboard ──────────────────────────────────────
  const managers = await prisma.user.findMany({
    where: { role: "MANAGER" },
    include: {
      reports: {
        include: {
          goals: {
            where: { status: GoalStatus.LOCKED },
            include: { checkins: true },
          },
        },
      },
    },
  })

  const managerEffectiveness = managers.map((mgr) => {
    const totalReports = mgr.reports.length
    const totalGoals = mgr.reports.reduce((s, r) => s + r.goals.length, 0)

    // Check-in completion: how many Q1-Q4 slots are filled
    const totalCheckinSlots = totalGoals * 4
    const filledCheckins = mgr.reports.reduce(
      (s, r) =>
        s +
        r.goals.reduce(
          (gs, g) =>
            gs + g.checkins.filter((c) => c.quarter !== "ANNUAL" && c.score !== null).length,
          0
        ),
      0
    )
    const checkinRate =
      totalCheckinSlots > 0
        ? Math.round((filledCheckins / totalCheckinSlots) * 100)
        : 0

    // Avg team score
    const allScores: number[] = []
    mgr.reports.forEach((r) => {
      r.goals.forEach((g) => {
        g.checkins.forEach((c) => {
          if (c.score !== null) allScores.push(c.score)
        })
      })
    })
    const avgTeamScore =
      allScores.length > 0
        ? Math.round(
            (allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10
          ) / 10
        : 0

    // Pending approvals count
    const pendingApprovals = mgr.reports.reduce(
      (s, r) =>
        s + r.goals.filter((g: any) => g.status === "SUBMITTED").length,
      0
    )

    return {
      managerId: mgr.id,
      managerName: mgr.name,
      department: mgr.department || "N/A",
      totalReports,
      totalGoals,
      checkinRate,
      avgTeamScore,
      pendingApprovals,
      filledCheckins,
      totalCheckinSlots,
    }
  })

  return NextResponse.json({
    qoqTrend,
    thrustBreakdown,
    scoreDistribution,
    leaderboard,
    heatmap,
    uomDistribution,
    managerEffectiveness,
    meta: {
      totalEmployees: users.length,
      totalGoals: users.reduce((s, u) => s + u.goals.length, 0),
      totalCheckins: users.reduce(
        (s, u) => s + u.goals.reduce((gs, g) => gs + g.checkins.length, 0),
        0
      ),
    },
  })
}