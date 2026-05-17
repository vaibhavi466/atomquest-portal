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
// This route must not depend on frontend preview logic.
function calculateCheckinScore({
  uomType,
  target,
  actual,
  deadline,
  completionDate,
}: {
  uomType: UoMType
  target?: number | null
  deadline?: string | Date | null
  actual: number | null
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

// Quarterly window enforcement.
// Uses active cycle if configured.
// If no active cycle exists, this function allows saving so local demo does not break.
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
  const q1End = new Date(cycle.q2Start)
  const q2End = new Date(cycle.q3Start)
  const q3End = new Date(cycle.q4Start)

  const q4End = new Date(cycle.q4Start)
  q4End.setMonth(q4End.getMonth() + 2)
  q4End.setDate(30)
  q4End.setHours(23, 59, 59, 999)

  const windows: Record<Quarter, { start: Date; end: Date }> = {
    [Quarter.Q1]: {
      start: cycle.q1Start,
      end: q1End,
    },
    [Quarter.Q2]: {
      start: cycle.q2Start,
      end: q2End,
    },
    [Quarter.Q3]: {
      start: cycle.q3Start,
      end: q3End,
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

// POST /api/checkins/:goalId
// Creates or updates one check-in when frontend sends goalId in the URL.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
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

    const { goalId } = await params

    if (!goalId) {
      return NextResponse.json(
        { error: "Goal ID is required" },
        { status: 400 }
      )
    }

    const body = await req.json()

    const quarter = body.quarter as Quarter
    const actualValue = body.actual
    const completionDateValue = body.completionDate
    const status = (body.status || CheckinStatus.NOT_STARTED) as CheckinStatus

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

    // Check-ins should be allowed only for approved/locked goals.
    if (
      goal.status !== GoalStatus.LOCKED &&
      goal.status !== GoalStatus.APPROVED
    ) {
      return NextResponse.json(
        { error: "Check-ins are allowed only for approved goals" },
        { status: 400 }
      )
    }

    // Enforce active quarterly window if an active cycle exists.
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
        actualValue === undefined ||
        actualValue === null ||
        actualValue === ""
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

    // Shared goal sync:
    // If this is the primary shared goal, sync achievement to linked shared goals.
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
    console.error("SAVE_CHECKIN_BY_GOAL_ID_ERROR:", error)

    return NextResponse.json(
      { error: "Failed to save check-in" },
      { status: 500 }
    )
  }
}