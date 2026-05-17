import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    if (role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: "Escalation log ID is required" },
        { status: 400 }
      )
    }

    const existingLog = await prisma.escalationLog.findUnique({
      where: { id },
    })

    if (!existingLog) {
      return NextResponse.json(
        { error: "Escalation log not found" },
        { status: 404 }
      )
    }

    if (existingLog.isResolved) {
      return NextResponse.json(
        { error: "Escalation log is already resolved" },
        { status: 400 }
      )
    }

    const updated = await prisma.escalationLog.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("RESOLVE_ESCALATION_LOG_ERROR:", error)

    return NextResponse.json(
      { error: "Failed to resolve escalation log" },
      { status: 500 }
    )
  }
}