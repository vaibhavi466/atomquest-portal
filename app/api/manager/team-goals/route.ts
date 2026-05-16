import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

// GET /api/manager/team-goals
// Returns all goals belonging to the manager's direct reports
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const managerId = (session.user as any).id
  const role = (session.user as any).role

  if (role !== "MANAGER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Get all direct reports
  const reports = await prisma.user.findMany({
    where: { managerId },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      goals: {
        include: {
          checkins: { orderBy: { quarter: "asc" } },
          auditLogs: {
            orderBy: { createdAt: "desc" },
            take: 5,
            include: { changedBy: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  return NextResponse.json(reports)
}