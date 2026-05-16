import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { validateGoalSet } from "@/lib/calculations"
import { GoalStatus, UoMType } from "@prisma/client"

// GET /api/goals — fetch current user's goals
// export async function GET(req: NextRequest) {
//   const session = await auth()
//   if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

//   const userId = (session.user as any).id

//   const goals = await prisma.goal.findMany({
//     where: { userId },
//     include: {
//       checkins: { orderBy: { quarter: "asc" } },
//     },
//     orderBy: { createdAt: "asc" },
//   })

//   return NextResponse.json(goals)
// }
export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id

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


// POST /api/goals — create a single goal (saved as DRAFT)
// export async function POST(req: NextRequest) {
//   const session = await auth()
//   if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

//   const userId = (session.user as any).id
//   const body = await req.json()

//   // Count existing non-returned goals
//   const existingGoals = await prisma.goal.findMany({
//     where: {
//       userId,
//       status: { not: GoalStatus.RETURNED },
//     },
//     select: { weightage: true },
//   })

//   if (existingGoals.length >= 8) {
//     return NextResponse.json({ error: "Maximum 8 goals allowed per cycle." }, { status: 400 })
//   }

//   if (body.weightage < 10) {
//     return NextResponse.json({ error: "Minimum 10% weightage per goal." }, { status: 400 })
//   }

//   const goal = await prisma.goal.create({
//     data: {
//       userId,
//       thrustArea: body.thrustArea,
//       title: body.title,
//       description: body.description || null,
//       uomType: body.uomType,
//       target: parseFloat(body.target),
//       weightage: parseFloat(body.weightage),
//       status: GoalStatus.DRAFT,
//     },
//   })

//   return NextResponse.json(goal, { status: 201 })
// }

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await req.json()

    const thrustArea = body.thrustArea
    const title = body.title
    const description = body.description || null

    // Supports both frontend naming styles
    const uomType = body.uomType || body.measurementType
    const targetValue = body.target ?? body.maxAllowedValue
    const weightageValue = body.weightage

    if (
      !thrustArea ||
      !title ||
      !uomType ||
      targetValue === undefined ||
      weightageValue === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    if (!Object.values(UoMType).includes(uomType)) {
      return NextResponse.json(
        { error: "Invalid measurement type" },
        { status: 400 }
      )
    }

    const target = Number(targetValue)
    const weightage = Number(weightageValue)

    if (Number.isNaN(target) || Number.isNaN(weightage)) {
      return NextResponse.json(
        { error: "Target and weightage must be valid numbers" },
        { status: 400 }
      )
    }

    if (weightage < 10) {
      return NextResponse.json(
        { error: "Minimum 10% weightage per goal." },
        { status: 400 }
      )
    }

    if (weightage > 100) {
      return NextResponse.json(
        { error: "Weightage cannot exceed 100%." },
        { status: 400 }
      )
    }

    // Count only editable goals for current draft submission
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

    if (editableGoals.length >= 8) {
      return NextResponse.json(
        { error: "Maximum 8 editable goals allowed." },
        { status: 400 }
      )
    }

    const existingWeightage = editableGoals.reduce(
      (sum, goal) => sum + goal.weightage,
      0
    )

    if (existingWeightage + weightage > 100) {
      return NextResponse.json(
        {
          error: `Total editable goal weightage cannot exceed 100%. Remaining: ${(
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