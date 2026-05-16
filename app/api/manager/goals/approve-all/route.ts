// bulk approve all submitted goals for an employee
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { GoalStatus } from "@prisma/client"
import { validateGoalSet } from "@/lib/calculations"

// POST /api/manager/goals/approve-all
// Approves all SUBMITTED goals for a specific employee at once
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const managerId = (session.user as any).id
  const role = (session.user as any).role

  if (role !== "MANAGER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { employeeId } = body

  // Verify this employee reports to this manager
  const employee = await prisma.user.findUnique({ where: { id: employeeId } })
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 })
  if (employee.managerId !== managerId && role !== "ADMIN") {
    return NextResponse.json({ error: "Not your direct report" }, { status: 403 })
  }

  const submittedGoals = await prisma.goal.findMany({
    where: { userId: employeeId, status: GoalStatus.SUBMITTED },
  })

  if (submittedGoals.length === 0) {
    return NextResponse.json({ error: "No submitted goals to approve" }, { status: 400 })
  }

  // Validate total weightage before bulk approve
  const validation = validateGoalSet(submittedGoals.map((g) => ({ weightage: g.weightage })))
  if (!validation.valid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 })
  }

  await prisma.goal.updateMany({
    where: { userId: employeeId, status: GoalStatus.SUBMITTED },
    data: { status: GoalStatus.LOCKED },
  })

  return NextResponse.json({ success: true, approved: submittedGoals.length })
}