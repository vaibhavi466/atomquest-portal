import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const logs = await prisma.escalationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      rule: { select: { name: true } },
      targetUser: { select: { name: true, email: true } },
      notifiedUser: { select: { name: true, role: true } },
    },
  })

  return NextResponse.json(logs)
}