import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { GoalStatus } from "@prisma/client"

// POST /api/admin/goals/unlock
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const adminId = (session.user as any).id

  const goal = await prisma.goal.findUnique({ where: { id: body.goalId } })
  if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 })

  if (goal.status !== GoalStatus.LOCKED) {
    return NextResponse.json({ error: "Only locked goals can be unlocked." }, { status: 400 })
  }

  await prisma.goal.update({
    where: { id: body.goalId },
    data: { status: GoalStatus.SUBMITTED },
  })

  // Audit log the unlock
  await prisma.auditLog.create({
    data: {
      goalId: body.goalId,
      changedById: adminId,
      field: "status",
      oldValue: "LOCKED",
      newValue: "SUBMITTED",
      reason: body.reason || "Unlocked by admin for revision",
    },
  })

  return NextResponse.json({ success: true })
}