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
// Reason: this dynamic route should not depend on frontend preview logic.
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

// POST /api/checkins/:goalId
// Creates or updates one check-in when frontend sends goalId in the URL.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id

    // CHANGE: Next.js 16-safe params handling.
    // Reason: using params.goalId directly can break in newer App Router versions.
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

    // CHANGE: Check-ins are allowed only for approved/locked goals.
    // Reason: employees should not add progress to draft/submitted/returned goals.
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

    // CHANGE: Upsert prevents duplicate check-in failure.
    // Reason: Prisma schema has @@unique([goalId, quarter]).
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
    console.error("SAVE_CHECKIN_BY_GOAL_ID_ERROR:", error)

    return NextResponse.json(
      { error: "Failed to save check-in" },
      { status: 500 }
    )
  }
}