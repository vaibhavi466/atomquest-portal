// import { NextRequest, NextResponse } from "next/server"
// import { auth } from "@/app/api/auth/[...nextauth]/route"
// import { prisma } from "@/lib/prisma"
// import { GoalStatus } from "@prisma/client"

// // GET /api/checkins
// // Returns all LOCKED goals with their checkins for the logged-in employee
// export async function GET(req: NextRequest) {
//   const session = await auth()
//   if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

//   const userId = (session.user as any).id

//   const goals = await prisma.goal.findMany({
//     where: {
//       userId,
//       status: GoalStatus.LOCKED,
//     },
//     include: {
//       checkins: {
//         orderBy: { quarter: "asc" },
//       },
//     },
//     orderBy: { createdAt: "asc" },
//   })

//   return NextResponse.json(goals)
// }

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import {
  CheckinStatus,
  GoalStatus,
  Quarter,
  UoMType,
} from "@prisma/client"

// CHANGE: Server-side score calculation.
// Reason: frontend score preview is only visual; backend must compute final score safely.
function calculateCheckinScore({
  uomType,
  target,
  actual,
}: {
  uomType: UoMType
  target: number
  actual: number
}) {
  if (Number.isNaN(target) || Number.isNaN(actual)) return 0

  if (uomType === UoMType.MIN) {
    if (target <= 0) return 0
    return Math.min((actual / target) * 100, 100)
  }

  if (uomType === UoMType.MAX) {
    if (target <= 0) return actual <= target ? 100 : 0
    return actual <= target ? 100 : Math.max((target / actual) * 100, 0)
  }

  if (uomType === UoMType.ZERO) {
    return actual === 0 ? 100 : 0
  }

  if (uomType === UoMType.TIMELINE) {
    return actual <= target ? 100 : 0
  }

  return 0
}

// GET /api/checkins
// Returns all approved/locked goals with their check-ins for the logged-in employee.
export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id

    const goals = await prisma.goal.findMany({
      where: {
        userId,

        // CHANGE: Include both LOCKED and APPROVED.
        // Reason: your app mainly uses LOCKED, but schema also contains APPROVED.
        status: {
          in: [GoalStatus.LOCKED, GoalStatus.APPROVED],
        },
      },
      include: {
        checkins: {
          orderBy: {
            quarter: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    return NextResponse.json(goals)
  } catch (error) {
    console.error("GET_CHECKINS_ERROR:", error)

    return NextResponse.json(
      { error: "Failed to fetch check-ins" },
      { status: 500 }
    )
  }
}

// POST /api/checkins
// Creates or updates one check-in when frontend sends goalId inside request body.
export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await req.json()

    const goalId = body.goalId
    const quarter = body.quarter as Quarter
    const actualValue = body.actual
    const status = (body.status || CheckinStatus.NOT_STARTED) as CheckinStatus

    if (!goalId) {
      return NextResponse.json(
        { error: "Goal ID is required" },
        { status: 400 }
      )
    }

    if (!quarter || !Object.values(Quarter).includes(quarter)) {
      return NextResponse.json(
        { error: "Valid quarter is required" },
        { status: 400 }
      )
    }

    if (!Object.values(CheckinStatus).includes(status)) {
      return NextResponse.json(
        { error: "Invalid check-in status" },
        { status: 400 }
      )
    }

    if (
      actualValue === "" ||
      actualValue === undefined ||
      actualValue === null
    ) {
      return NextResponse.json(
        { error: "Actual achievement is required" },
        { status: 400 }
      )
    }

    const actual = Number(actualValue)

    if (Number.isNaN(actual)) {
      return NextResponse.json(
        { error: "Actual achievement must be a valid number" },
        { status: 400 }
      )
    }

    const goal = await prisma.goal.findUnique({
      where: {
        id: goalId,
      },
    })

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    if (goal.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // CHANGE: Check-ins should happen only after manager approval.
    // Reason: draft/submitted/returned goals should not accept progress check-ins.
    if (
      goal.status !== GoalStatus.LOCKED &&
      goal.status !== GoalStatus.APPROVED
    ) {
      return NextResponse.json(
        { error: "Check-ins are allowed only for approved goals" },
        { status: 400 }
      )
    }

    const score = calculateCheckinScore({
      uomType: goal.uomType,
      target: goal.target,
      actual,
    })

    // CHANGE: Use upsert instead of create.
    // Reason: schema has @@unique([goalId, quarter]), so repeated Q2 saves should update, not crash.
    const checkin = await prisma.checkin.upsert({
      where: {
        goalId_quarter: {
          goalId,
          quarter,
        },
      },
      update: {
        actual,
        status,
        score,
      },
      create: {
        goalId,
        userId,
        quarter,
        actual,
        status,
        score,
      },
    })

    return NextResponse.json(checkin, { status: 200 })
  } catch (error) {
    console.error("SAVE_CHECKIN_ERROR:", error)

    return NextResponse.json(
      { error: "Failed to save check-in" },
      { status: 500 }
    )
  }
}