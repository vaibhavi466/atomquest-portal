import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { GoalStatus,Role } from "@prisma/client"
import { notify } from "@/lib/notifications"

// POST /api/manager/goals/:id/return
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const managerId = (session.user as any).id
    const role = (session.user as any).role
    const { id } = await params

    if (role !== Role.MANAGER && role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const reason = body.reason?.trim()

    if (!reason) {
      return NextResponse.json(
        { error: "Return reason is required" },
        { status: 400 }
      )
    }

    const goal = await prisma.goal.findUnique({
      where: { id },
      include: {
        user: true,
      },
    })

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    if (role !== Role.ADMIN && goal.user.managerId !== managerId) {
      return NextResponse.json(
        { error: "You can return only your direct report's goals" },
        { status: 403 }
      )
    }

    if (goal.status !== GoalStatus.SUBMITTED) {
      return NextResponse.json(
        { error: "Only submitted goals can be returned" },
        { status: 400 }
      )
    }

    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: {
        status: GoalStatus.RETURNED,
      },
    })

    const manager = await prisma.user.findUnique({
      where: { id: managerId },
      select: { name: true },
    })

    await notify({
      event: "goal_returned",
      toEmail: goal.user.email,
      toName: goal.user.name,
      managerName: manager?.name,
      reason: body.reason,
      deepLink: "/employee/goals",
    })

    await prisma.auditLog.create({
      data: {
        goalId: id,
        changedById: managerId,
        field: "status",
        oldValue: goal.status,
        newValue: GoalStatus.RETURNED,
        reason,
      },
    })

    return NextResponse.json(updatedGoal)
  } catch (error) {
    console.error("RETURN_GOAL_ERROR:", error)

    return NextResponse.json(
      { error: "Return failed" },
      { status: 500 }
    )
  }
}