import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import {
  CheckinStatus,
  GoalStatus,
  Quarter,
  UoMType,
} from "@prisma/client"

// Server-side score calculation.
// Backend must calculate the final score safely.
function calculateCheckinScore({
  uomType,
  target,
  actual,
  deadline,
  completionDate,
}: {
  uomType: UoMType
  target: number | null
  actual: number | null
  deadline?: Date | null
  completionDate?: Date | null
}) {
  if (uomType === UoMType.TIMELINE) {
    if (!deadline || !completionDate) return 0

    const deadlineMs = new Date(deadline).getTime()
    const completionMs = new Date(completionDate).getTime()

    if (Number.isNaN(deadlineMs) || Number.isNaN(completionMs)) return 0

    return completionMs <= deadlineMs ? 100 : 0
  }

  if (actual === null || actual === undefined || Number.isNaN(actual)) return 0
  if (target === null || target === undefined || Number.isNaN(target)) return 0

  if (uomType === UoMType.MIN) {
    if (target <= 0) return 0
    return Math.min(Math.round((actual / target) * 100), 100)
  }

  if (uomType === UoMType.MAX) {
    if (actual === 0) return 100
    if (target <= 0) return actual <= target ? 100 : 0
    return Math.min(Math.round((target / actual) * 100), 100)
  }

  if (uomType === UoMType.ZERO) {
    return actual === 0 ? 100 : 0
  }

  return 0
}

function isWithinQuarterWindow(
  quarter: Quarter,
  cycle: {
    q1Start: Date
    q2Start: Date
    q3Start: Date
    q4Start: Date
  },
  now = new Date()
) {
  const q4End = new Date(cycle.q4Start)
  q4End.setMonth(q4End.getMonth() + 2)
  q4End.setDate(30)
  q4End.setHours(23, 59, 59, 999)

  const windows: Record<Quarter, { start: Date; end: Date }> = {
    [Quarter.Q1]: {
      start: cycle.q1Start,
      end: cycle.q2Start,
    },
    [Quarter.Q2]: {
      start: cycle.q2Start,
      end: cycle.q3Start,
    },
    [Quarter.Q3]: {
      start: cycle.q3Start,
      end: cycle.q4Start,
    },
    [Quarter.Q4]: {
      start: cycle.q4Start,
      end: q4End,
    },
    [Quarter.ANNUAL]: {
      start: cycle.q4Start,
      end: q4End,
    },
  }

  const selectedWindow = windows[quarter]

  if (!selectedWindow) return false

  return now >= selectedWindow.start && now <= selectedWindow.end
}

// GET /api/checkins
// Returns approved/locked goals with their check-ins for the logged-in employee.
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
      where: {
        userId,
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

    const goalId = body.goalId
    const quarter = body.quarter as Quarter
    const actualValue = body.actual
    const completionDateValue = body.completionDate
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

    const goal = await prisma.goal.findUnique({
      where: {
        id: goalId,
      },
    })

    if (!goal) {
      return NextResponse.json(
        { error: "Goal not found" },
        { status: 404 }
      )
    }

    if (goal.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    if (
      goal.status !== GoalStatus.LOCKED &&
      goal.status !== GoalStatus.APPROVED
    ) {
      return NextResponse.json(
        { error: "Check-ins are allowed only for approved goals" },
        { status: 400 }
      )
    }

    const activeCycle = await prisma.cycle.findFirst({
      where: {
        isActive: true,
      },
      select: {
        q1Start: true,
        q2Start: true,
        q3Start: true,
        q4Start: true,
      },
    })

    if (activeCycle && !isWithinQuarterWindow(quarter, activeCycle)) {
      return NextResponse.json(
        { error: `${quarter} check-in window is currently closed.` },
        { status: 400 }
      )
    }

    let actual: number | null = null
    let completionDate: Date | null = null

    if (goal.uomType === UoMType.TIMELINE) {
      if (!goal.deadline) {
        return NextResponse.json(
          { error: "Deadline is not configured for this timeline goal" },
          { status: 400 }
        )
      }

      if (!completionDateValue) {
        return NextResponse.json(
          { error: "Completion date is required for timeline goals" },
          { status: 400 }
        )
      }

      completionDate = new Date(completionDateValue)

      if (Number.isNaN(completionDate.getTime())) {
        return NextResponse.json(
          { error: "Completion date must be a valid date" },
          { status: 400 }
        )
      }
    } else {
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

      actual = Number(actualValue)

      if (Number.isNaN(actual)) {
        return NextResponse.json(
          { error: "Actual achievement must be a valid number" },
          { status: 400 }
        )
      }

      if (goal.uomType === UoMType.ZERO && actual < 0) {
        return NextResponse.json(
          { error: "Actual value cannot be negative for zero-based goals" },
          { status: 400 }
        )
      }
    }

    const score = calculateCheckinScore({
      uomType: goal.uomType,
      target: goal.target,
      actual,
      deadline: goal.deadline,
      completionDate,
    })

    const checkin = await prisma.checkin.upsert({
      where: {
        goalId_quarter: {
          goalId,
          quarter,
        },
      },
      update: {
        actual,
        completionDate,
        status,
        score,
      },
      create: {
        goalId,
        userId,
        quarter,
        actual,
        completionDate,
        status,
        score,
      },
    })

    // Sync achievement updates from primary shared goal to linked shared goals.
    if (goal.isShared && !goal.sharedFromId) {
      const linkedGoals = await prisma.goal.findMany({
        where: {
          sharedFromId: goal.id,
        },
        select: {
          id: true,
          userId: true,
        },
      })

      for (const linkedGoal of linkedGoals) {
        await prisma.checkin.upsert({
          where: {
            goalId_quarter: {
              goalId: linkedGoal.id,
              quarter,
            },
          },
          update: {
            actual,
            completionDate,
            status,
            score,
          },
          create: {
            goalId: linkedGoal.id,
            userId: linkedGoal.userId,
            quarter,
            actual,
            completionDate,
            status,
            score,
          },
        })
      }
    }

    return NextResponse.json(checkin, { status: 200 })
  } catch (error) {
    console.error("SAVE_CHECKIN_ERROR:", error)

    return NextResponse.json(
      { error: "Failed to save check-in" },
      { status: 500 }
    )
  }
}