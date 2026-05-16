import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { GoalStatus, UoMType } from "@prisma/client"

// POST /api/manager/shared-goals
// Push a shared goal to one or more employees
// Employee gets: title, description, uomType, target (READ-ONLY)
// Employee can only adjust weightage
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const managerId = (session.user as any).id
  const role = (session.user as any).role

  if (role !== "MANAGER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { employeeIds, goal } = body

  if (!employeeIds || employeeIds.length === 0) {
    return NextResponse.json({ error: "Select at least one employee" }, { status: 400 })
  }

  // Verify all employees are direct reports
  const employees = await prisma.user.findMany({
    where: {
      id: { in: employeeIds },
      managerId,
    },
  })

  if (employees.length !== employeeIds.length && role !== "ADMIN") {
    return NextResponse.json(
      { error: "Some employees are not your direct reports" },
      { status: 403 }
    )
  }

  // Create a shared goal for each employee
  // Target is locked (isShared = true means employee cannot edit target)
  const createdGoals = await prisma.goal.createMany({
    data: employeeIds.map((empId: string) => ({
      userId: empId,
      thrustArea: goal.thrustArea,
      title: goal.title,
      description: goal.description || null,
      uomType: goal.uomType as UoMType,
      target: parseFloat(goal.target),
      weightage: parseFloat(goal.weightage || 10),
      status: GoalStatus.DRAFT,
      isShared: true,
      sharedFromId: managerId,
    })),
  })

  return NextResponse.json({ success: true, created: createdGoals.count })
}