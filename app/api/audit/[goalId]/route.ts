import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

export async function GET(
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
    const role = (session.user as any).role

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

    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        user: {
          select: {
            id: true,
            managerId: true,
          },
        },
      },
    })

    if (!goal) {
      return NextResponse.json(
        { error: "Goal not found" },
        { status: 404 }
      )
    }

    const isOwner = goal.userId === userId
    const isManagerOfOwner = goal.user.managerId === userId
    const isAdmin = role === Role.ADMIN

    if (!isOwner && !isManagerOfOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        goalId,
      },
      include: {
        changedBy: {
          select: {
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(auditLogs)
  } catch (error) {
    console.error("GET_AUDIT_LOGS_ERROR:", error)

    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    )
  }
}