import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { GoalStatus, Role } from "@prisma/client"
import { notify } from "@/lib/notifications"
import { validateGoalSet } from "@/lib/calculations"

// POST /api/manager/goals/:id/approve
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try{
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  
    const managerId = (session.user as any).id
    const role = (session.user as any).role
    const { id } = await params

    if (role !== "MANAGER" && role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

  const goal = await prisma.goal.findUnique({
    where: { id },
    include: { user: true },
  })

  if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 })


  // Verify this goal belongs to a direct report
    if (role !== Role.ADMIN && goal.user.managerId !== managerId) {
        return NextResponse.json(
            { error: "You can approve only your direct report's goals" },
            { status: 403 }
      )
    }

  if (goal.status !== GoalStatus.SUBMITTED) {
    return NextResponse.json(
      { error: "Only submitted goals can be approved." },
      { status: 400 }
    )
  }
  const submittedGoals = await prisma.goal.findMany({
    where: {
      userId: goal.userId,
      status: GoalStatus.SUBMITTED,
    },
    select: {
      weightage: true,
    },
  })
  const validation = validateGoalSet(submittedGoals)

  if (!validation.valid) {
    return NextResponse.json(
      { errors: validation.errors },
      { status: 400 }
    )
  }

  const updated = await prisma.goal.update({
    where: { id },
    data: { status: GoalStatus.LOCKED, lockedAt: new Date(), },
  })

  const manager = await prisma.user.findUnique({
    where: { id: managerId },
    select: { name: true, email: true },
  })

  await notify({
    event: "goal_approved",
    toEmail: goal.user.email,
    toName:
    goal.user.name?.trim() ||
    goal.user.email.split("@")[0] ||
    "Employee",
  managerName:
    manager?.name?.trim() ||
    manager?.email?.split("@")[0] ||
    "Manager",
    deepLink: "/employee/goals",
  })

    await prisma.auditLog.create({
      data: {
        goalId: id,
        changedById: managerId,
        field: "status",
        oldValue: goal.status,
        newValue: GoalStatus.LOCKED,
        reason: "Goal approved by manager",
      },
    })

    return NextResponse.json(updated)
  }catch (error) {
    console.error("APPROVE_GOAL_ERROR:", error)

    return NextResponse.json(
      { error: "Approval failed" },
      { status: 500 }
    )
  }
}
