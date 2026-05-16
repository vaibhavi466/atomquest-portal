import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { GoalStatus, UoMType } from "@prisma/client"
// import { json, json } from "stream/consumers"

// PATCH /api/goals/:id — edit a goal (only if DRAFT or RETURNED)
export async function PATCH(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> } 
) {
  try {

    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const userId = (session.user as any).id
    if (!id) {
      return NextResponse.json({ error: "Goal ID is required" }, { status: 400 })
    }
  
    const goal = await prisma.goal.findUnique({ where: { id } })

    if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    if (goal.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    // Only allow edits on DRAFT or RETURNED goals
    if (goal.status !== GoalStatus.DRAFT && goal.status !== GoalStatus.RETURNED) {
      return NextResponse.json(
        { error: "Goal cannot be edited after submission." },
        { status: 400 }
      )
    }

    const body = await req.json()
    // IMPORTANT: Shared goals can update ONLY weightage
    if (goal.isShared) {
      const weightage = Number(body.weightage)

      if (Number.isNaN(weightage)) {
        return NextResponse.json(
          { error: "Weightage must be a valid number" },
          { status: 400 }
        )
      }

      if (weightage < 10 || weightage > 100) {
        return NextResponse.json(
          { error: "Weightage must be between 10 and 100" },
          { status: 400 }
        )
      }
      // CHANGE: Calculate total weightage of other editable goals.
      // This prevents employee from exceeding total 100% by editing shared goal weightage.
      const otherEditableGoals = await prisma.goal.findMany({
          where: {
            userId,
            id: {
              not: id,
            },
            status: {
              in: [GoalStatus.DRAFT, GoalStatus.RETURNED],
            },
          },
          select: {
            weightage: true,
          },
        }
      )

        const otherWeightageTotal = otherEditableGoals.reduce(
          (sum, goal) => sum + goal.weightage,
          0
        )

        const maxAllowedWeightage = 100 - otherWeightageTotal

        if (weightage > maxAllowedWeightage) {
          return NextResponse.json(
            {
              error: `Weightage cannot exceed ${maxAllowedWeightage.toFixed(
                1
              )}% for this goal.`,
            },
            { status: 400 }
          )
        }

      const updated = await prisma.goal.update({
        where: { id },
        data: {
          weightage,
        },
      })

      return NextResponse.json(updated)
    }

    // Normal employee-created goals can update all fields
    const thrustArea = body.thrustArea
    const title = body.title
    const description = body.description || null

    // Support the current form field name plus older aliases.
    const uomType = body.uomType || body.unomType || body.measurementType
    // Supports both possible frontend names
    const targetValue = body.target ?? body.maxAllowedValue
    const weightageValue = body.weightage

    if (!thrustArea || !title || !uomType || targetValue === undefined || weightageValue === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if(!Object.values(UoMType).includes(uomType)) {
      return NextResponse.json({ error: "Invalid measurement type" }, { status: 400 })
    }

    const target = Number(targetValue)
    const weightage = Number(weightageValue)

    // CHANGE: Validate total editable goal weightage during normal goal edit.
      const otherEditableGoals = await prisma.goal.findMany({
        where: {
          userId,
          id: {
            not: id,
          },
          status: {
            in: [GoalStatus.DRAFT, GoalStatus.RETURNED],
          },
        },
        select: {
          weightage: true,
        },
      })

      const otherWeightageTotal = otherEditableGoals.reduce(
        (sum, goal) => sum + goal.weightage,
        0
      )

      const maxAllowedWeightage = 100 - otherWeightageTotal

      if (weightage > maxAllowedWeightage) {
        return NextResponse.json(
          {
            error: `Weightage cannot exceed ${maxAllowedWeightage.toFixed(
              1
            )}% for this goal.`,
          },
          { status: 400 }
        )
      }

    if(Number.isNaN(target) || Number.isNaN(weightage)) {
      return NextResponse.json({ error: "Target and weightage must be valid numbers" }, { status: 400 })
    }

    if(weightage <= 0 || weightage > 100) {
      return NextResponse.json({ error: "Weightage must be a value between 1 and 100" }, { status: 400 })
    }

    const updated = await prisma.goal.update({
      where: { id },
      data: {
        thrustArea,
        title,
        description,
        uomType,
        target,
        weightage
      }
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error("PATCH Goal error:", error)
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 })
  }
}

// DELETE /api/goals/:id — only DRAFT goals can be deleted
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const userId = (session.user as any).id
  const goal = await prisma.goal.findUnique({ where: { id } })

  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (goal.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (goal.status !== GoalStatus.DRAFT && goal.status !== GoalStatus.RETURNED) {
    return NextResponse.json({ error: "Only draft goals can be deleted." }, { status: 400 })
  }

  await prisma.goal.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
