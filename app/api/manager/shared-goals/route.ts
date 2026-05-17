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

  
  const uomType = goal.uomType as UoMType
const weightage = parseFloat(goal.weightage || 10)

if (weightage < 10 || weightage > 100) {
  return NextResponse.json(
    { error: "Weightage must be between 10 and 100" },
    { status: 400 }
  )
}

const target =
  uomType === UoMType.TIMELINE ? null : parseFloat(goal.target)

const deadline =
  uomType === UoMType.TIMELINE && goal.deadline
    ? new Date(goal.deadline)
    : null

if (uomType !== UoMType.TIMELINE && Number.isNaN(target as number)) {
  return NextResponse.json(
    { error: "Target must be a valid number" },
    { status: 400 }
  )
}

  if (uomType === UoMType.TIMELINE && (!deadline || Number.isNaN(deadline.getTime()))) {
    return NextResponse.json(
      { error: "Deadline is required for timeline shared goals" },
      { status: 400 }
    )
  }

  const [primaryEmployeeId, ...otherEmployeeIds] = employeeIds

  const primaryGoal = await prisma.goal.create({
    data: {
      userId: primaryEmployeeId,
      thrustArea: goal.thrustArea,
      title: goal.title,
      description: goal.description || null,
      uomType,
      target,
      deadline,
      weightage,
      status: GoalStatus.DRAFT,
      isShared: true,
    },
  })

  if (otherEmployeeIds.length > 0) {
    await prisma.goal.createMany({
      data: otherEmployeeIds.map((empId: string) => ({
        userId: empId,
        thrustArea: goal.thrustArea,
        title: goal.title,
        description: goal.description || null,
        uomType,
        target,
        deadline,
        weightage,
        status: GoalStatus.DRAFT,
        isShared: true,
        sharedFromId: primaryGoal.id,
      })),
    })
  }

  return NextResponse.json({
    success: true,
    created: employeeIds.length,
    primaryGoalId: primaryGoal.id,
  })

}