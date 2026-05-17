import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { validateGoalSet } from "@/lib/calculations"
import { GoalStatus } from "@prisma/client"
import { notify } from "@/lib/notifications"

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

  // Notify manager
  const employee = await prisma.user.findUnique({
    where: { id: userId },
    include: { manager: { select: { name: true, email: true } } },
  })

  if (employee?.manager) {
    await notify({
      event: "goal_submitted",
      toEmail: employee.manager.email,
      toName:
          employee.manager.name?.trim() ||
          employee.manager.email.split("@")[0] ||
          "Manager",
      employeeName:
        employee.name?.trim() ||
        employee.email.split("@")[0] ||
        "Employee",
      goalCount: goals.length,
      deepLink: "/manager/team",
    })
  }

  return NextResponse.json({ success: true, submitted: goals.length })
}