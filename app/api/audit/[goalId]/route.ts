import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

// GET /api/audit/:goalId — fetch audit trail for a goal
export async function GET(req: NextRequest, { params }: { params: { goalId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const logs = await prisma.auditLog.findMany({
    where: { goalId: params.goalId },
    include: {
      changedBy: { select: { name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(logs)
}