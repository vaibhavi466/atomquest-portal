import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { GoalStatus } from "@prisma/client"
import { calculateOverallScore } from "@/lib/calculations"

// GET /api/checkins/summary
// Returns overall weighted score across all locked goals for the current user
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id

  const goals = await prisma.goal.findMany({
    where: { userId, status: GoalStatus.LOCKED },
    include: { checkins: true },
  })

  // Build per-goal score summary
  const goalSummaries = goals.map((goal) => {
    const quarterScores = goal.checkins
      .filter((c) => c.score !== null)
      .map((c) => c.score as number)

    const avgScore =
      quarterScores.length > 0
        ? quarterScores.reduce((a, b) => a + b, 0) / quarterScores.length
        : 0

    return {
      goalId: goal.id,
      title: goal.title,
      thrustArea: goal.thrustArea,
      weightage: goal.weightage,
      score: avgScore,
      checkinsCount: goal.checkins.length,
      completedCount: goal.checkins.filter((c) => c.status === "COMPLETED").length,
    }
  })

  const overallScore = calculateOverallScore(
    goalSummaries.map((g) => ({ score: g.score, weightage: g.weightage }))
  )

  return NextResponse.json({
    overallScore,
    goals: goalSummaries,
    totalGoals: goals.length,
    totalCheckins: goals.reduce((s, g) => s + g.checkins.length, 0),
  })
}