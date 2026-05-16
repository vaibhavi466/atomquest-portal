import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

// GET /api/audit/all — all audit logs for admin view
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as any).role
  const managerId = (session.user as any).id

  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const whereClause =
    role === "ADMIN" ? {} : { goal: { user: { managerId } } }

  const logs = await prisma.auditLog.findMany({
    where: whereClause,
    include: {
      goal: {
        select: {
          title: true,
          user: { select: { name: true } },
        },
      },
      changedBy: { select: { name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return NextResponse.json(logs)
}