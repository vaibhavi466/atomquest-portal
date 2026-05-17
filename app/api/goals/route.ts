import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { GoalStatus, UoMType } from "@prisma/client"

// Utility: checks if current date is inside allowed window
function isWithinWindow(start: Date, end: Date, now = new Date()) {
  return now >= start && now <= end
}

// GET /api/goals
// Fetch current logged-in user's goals
export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id

    if (!userId) {
      return NextResponse.json(
        { error: "User ID missing in session" },
        { status: 401 }
      )
    }

    const goals = await prisma.goal.findMany({
      where: { userId },
      include: {
        checkins: {
          orderBy: { quarter: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(goals)
  } catch (error) {
    console.error("GET_GOALS_ERROR:", error)

    return NextResponse.json(
      { error: "Failed to fetch goals" },
      { status: 500 }
    )
  }
}

// POST /api/goals
// Create a single goal as DRAFT
export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id

    if (!userId) {
      return NextResponse.json(
        { error: "User ID missing in session" },
        { status: 401 }
      )
    }

    const body = await req.json()

    const thrustArea = typeof body.thrustArea === "string" ? body.thrustArea.trim() : ""
    const title = typeof body.title === "string" ? body.title.trim() : ""
    const description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null

    // Supports both frontend naming styles
    const rawUomType = body.uomType || body.measurementType
    const targetValue = body.target ?? body.maxAllowedValue
    const deadlineValue = body.deadline
    const weightageValue = body.weightage

    // Basic required validation
    if (!thrustArea || !title || !rawUomType || weightageValue === undefined || weightageValue === null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate UoM type safely
    if (!Object.values(UoMType).includes(rawUomType as UoMType)) {
      return NextResponse.json(
        { error: "Invalid unit of measurement type" },
        { status: 400 }
      )
    }

    const uomType = rawUomType as UoMType

    // Validate target/deadline based on UoM type
    let target: number | null = null
    let deadline: Date | null = null

    if (uomType === UoMType.TIMELINE) {
      if (!deadlineValue) {
        return NextResponse.json(
          { error: "Deadline is required for timeline goals" },
          { status: 400 }
        )
      }

      deadline = new Date(deadlineValue)

      if (Number.isNaN(deadline.getTime())) {
        return NextResponse.json(
          { error: "Deadline must be a valid date" },
          { status: 400 }
        )
      }
    } else {
      if (targetValue === undefined || targetValue === null || targetValue === "") {
        return NextResponse.json(
          { error: "Target is required" },
          { status: 400 }
        )
      }

      target = Number(targetValue)

      if (Number.isNaN(target)) {
        return NextResponse.json(
          { error: "Target must be a valid number" },
          { status: 400 }
        )
      }
    }

    const weightage = Number(weightageValue)

    if (Number.isNaN(weightage)) {
      return NextResponse.json(
        { error: "Weightage must be a valid number" },
        { status: 400 }
      )
    }

    if (weightage < 10) {
      return NextResponse.json(
        { error: "Minimum 10% weightage per goal is required." },
        { status: 400 }
      )
    }

    if (weightage > 100) {
      return NextResponse.json(
        { error: "Weightage cannot exceed 100%." },
        { status: 400 }
      )
    }

    // ZERO-based goals must have target 0
    if (uomType === UoMType.ZERO && target !== 0) {
      return NextResponse.json(
        { error: "ZERO type goals must have target 0." },
        { status: 400 }
      )
    }

    // Enforce active goal-setting window if active cycle exists
    const activeCycle = await prisma.cycle.findFirst({
      where: { isActive: true },
      select: {
        goalOpenDate: true,
        goalCloseDate: true,
      },
    })

    if (
      activeCycle &&
      !isWithinWindow(activeCycle.goalOpenDate, activeCycle.goalCloseDate)
    ) {
      return NextResponse.json(
        { error: "Goal creation window is currently closed." },
        { status: 400 }
      )
    }

    // Count current editable goals
    const editableGoals = await prisma.goal.findMany({
      where: {
        userId,
        status: {
          in: [GoalStatus.DRAFT, GoalStatus.RETURNED],
        },
      },
      select: {
        weightage: true,
      },
    })

    // Max 8 goals rule
    if (editableGoals.length >= 8) {
      return NextResponse.json(
        { error: "Maximum 8 goals allowed per employee." },
        { status: 400 }
      )
    }

    // Prevent total draft/returned weightage from exceeding 100
    const existingWeightage = editableGoals.reduce(
      (sum, goal) => sum + Number(goal.weightage),
      0
    )

    const totalAfterAdding = existingWeightage + weightage

    if (totalAfterAdding > 100.01) {
      return NextResponse.json(
        {
          error: `Total goal weightage cannot exceed 100%. Remaining weightage: ${Math.max(
            0,
            100 - existingWeightage
          ).toFixed(1)}%`,
        },
        { status: 400 }
      )
    }

    const goal = await prisma.goal.create({
      data: {
        userId,
        thrustArea,
        title,
        description,
        uomType,
        target,
        deadline,
        weightage,
        status: GoalStatus.DRAFT,
      },
    })

    return NextResponse.json(goal, { status: 201 })
  } catch (error) {
    console.error("CREATE_GOAL_ERROR:", error)

    return NextResponse.json(
      { error: "Failed to create goal" },
      { status: 500 }
    )
  }
}