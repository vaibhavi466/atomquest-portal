import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { GoalStatus } from "@prisma/client"

// GET /api/manager/team-checkins
// Returns all locked goals + checkins for all direct reports
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const managerId = (session.user as any).id
  const role = (session.user as any).role

  if (role !== "MANAGER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const reports = await prisma.user.findMany({
    where: { managerId },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      goals: {
        where: { status: GoalStatus.LOCKED },
        include: {
          checkins: { orderBy: { quarter: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  return NextResponse.json(reports)
}
