import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { GoalStatus, Role } from "@prisma/client"

export async function PATCH(
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

    const target = Number(body.target)
    const weightage = Number(body.weightage)
    const description = body.description || null

    if (Number.isNaN(target)) {
      return NextResponse.json(
        { error: "Target must be a valid number" },
        { status: 400 }
      )
    }

    if (Number.isNaN(weightage)) {
      return NextResponse.json(
        { error: "Weightage must be a valid number" },
        { status: 400 }
      )
    }

    if (weightage < 10 || weightage > 100) {
      return NextResponse.json(
        { error: "Weightage must be between 10 and 100" },
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
        { error: "You can edit only your direct report's goals" },
        { status: 403 }
      )
    }

    if (goal.status !== GoalStatus.SUBMITTED) {
      return NextResponse.json(
        { error: "Only submitted goals can be edited by manager" },
        { status: 400 }
      )
    }

    if (goal.isShared && target !== goal.target) {
      return NextResponse.json(
        { error: "Target cannot be changed for shared goals" },
        { status: 400 }
      )
    }

    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: {
        target,
        weightage,
        description,
      },
    })

    const auditLogs = []

    if (goal.target !== target) {
      auditLogs.push({
        goalId: id,
        changedById: managerId,
        field: "target",
        oldValue: String(goal.target),
        newValue: String(target),
        reason: "Manager edited goal target",
      })
    }

    if (goal.weightage !== weightage) {
      auditLogs.push({
        goalId: id,
        changedById: managerId,
        field: "weightage",
        oldValue: String(goal.weightage),
        newValue: String(weightage),
        reason: "Manager edited goal weightage",
      })
    }

    if ((goal.description || "") !== (description || "")) {
      auditLogs.push({
        goalId: id,
        changedById: managerId,
        field: "description",
        oldValue: goal.description || "",
        newValue: description || "",
        reason: "Manager edited goal description",
      })
    }

    if (auditLogs.length > 0) {
      await prisma.auditLog.createMany({
        data: auditLogs,
      })
    }

    return NextResponse.json(updatedGoal)
  } catch (error) {
    console.error("EDIT_GOAL_ERROR:", error)

    return NextResponse.json(
      { error: "Update failed" },
      { status: 500 }
    )
  }
}