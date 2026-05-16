import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { validateGoalSet } from "@/lib/calculations"
import { GoalStatus } from "@prisma/client"

// POST /api/goals/submit — submit all DRAFT/RETURNED goals for approval
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id

  const goals = await prisma.goal.findMany({
    where: {
      userId,
      status: { in: [GoalStatus.DRAFT, GoalStatus.RETURNED] },
    },
  })

  if (goals.length === 0) {
    return NextResponse.json({ error: "No goals to submit." }, { status: 400 })
  }

  // Run full BRD validation
  const validation = validateGoalSet(goals.map((g) => ({ weightage: g.weightage })))

  if (!validation.valid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 })
  }

  // Submit all goals
  await prisma.goal.updateMany({
    where: {
      userId,
      status: { in: [GoalStatus.DRAFT, GoalStatus.RETURNED] },
    },
    data: { status: GoalStatus.SUBMITTED },
  })

  return NextResponse.json({ success: true, submitted: goals.length })
}