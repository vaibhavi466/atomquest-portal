// Manager adds/updates a comment on an employee check-in.

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { Role, Quarter } from "@prisma/client"

// PATCH /api/checkins/:goalId/manager-comment
// Manager adds or updates their check-in comment.
//
// IMPORTANT:
// Your frontend currently calls:
// /api/checkins/${someId}/manager-comment
//
// In your current app, that "someId" may be either:
// 1. a check-in id, or
// 2. a goal id + quarter sent in body.
//
// This route supports both safely.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = (session.user as any).role
    const managerId = (session.user as any).id

    // CHANGE: Use Prisma Role enum instead of raw string comparisons.
    // This avoids typos like "manager" vs "MANAGER".
    if (role !== Role.MANAGER && role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // CHANGE: Next.js 16-safe params handling.
    // Because the folder name is [goalId], the dynamic value is params.goalId.
    const { goalId } = await params

    if (!goalId) {
      return NextResponse.json(
        { error: "Check-in or goal ID is required" },
        { status: 400 }
      )
    }

    const body = await req.json()

    // CHANGE: Support both possible frontend payload names.
    // Some components may send `managerComment`, others may send `comment`.
    const managerComment = String(
      body.managerComment ?? body.comment ?? ""
    ).trim()

    if (!managerComment) {
      return NextResponse.json(
        { error: "Comment cannot be empty" },
        { status: 400 }
      )
    }

    // CHANGE: First try treating the URL param as a CHECK-IN ID.
    // Your browser console showed:
    // /api/checkins/cmp7eowob0005umuozt3davvl/manager-comment
    // That value looked like a check-in id.
    let checkin = await prisma.checkin.findUnique({
      where: {
        id: goalId,
      },
      include: {
        goal: {
          include: {
            user: true,
          },
        },
      },
    })

    // CHANGE: Fallback support for old frontend logic.
    // If the URL param is actually a GOAL ID, then body.quarter is required
    // to find the correct check-in using the unique pair goalId + quarter.
    if (!checkin) {
      const quarter = body.quarter as Quarter | undefined

      if (!quarter || !Object.values(Quarter).includes(quarter)) {
        return NextResponse.json(
          {
            error:
              "Check-in not found. If sending goalId, a valid quarter is required.",
          },
          { status: 404 }
        )
      }

      checkin = await prisma.checkin.findUnique({
        where: {
          goalId_quarter: {
            goalId,
            quarter,
          },
        },
        include: {
          goal: {
            include: {
              user: true,
            },
          },
        },
      })
    }

    if (!checkin) {
      return NextResponse.json(
        { error: "Check-in not found" },
        { status: 404 }
      )
    }

    // CHANGE: Manager can comment only on direct reports.
    // Admin is allowed globally.
    if (role !== Role.ADMIN && checkin.goal.user.managerId !== managerId) {
      return NextResponse.json(
        { error: "Not your direct report" },
        { status: 403 }
      )
    }

    // CHANGE: Save into the actual Prisma field:
    // Checkin.managerComment
    const updatedCheckin = await prisma.checkin.update({
      where: {
        id: checkin.id,
      },
      data: {
        managerComment,
      },
    })

    return NextResponse.json(updatedCheckin, { status: 200 })
  } catch (error) {
    console.error("SAVE_MANAGER_COMMENT_ERROR:", error)

    return NextResponse.json(
      { error: "Failed to save manager comment" },
      { status: 500 }
    )
  }
}

// CHANGE: POST fallback.
// This makes the route work even if any frontend file uses axios.post()
// instead of axios.patch().
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ goalId: string }> }
) {
  return PATCH(req, context)
}