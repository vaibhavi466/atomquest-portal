import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { GoalStatus, Role } from "@prisma/client"

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

  const updated = await prisma.goal.update({
    where: { id },
    data: { status: GoalStatus.LOCKED },
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
