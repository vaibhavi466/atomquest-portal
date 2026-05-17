import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { EscalationTrigger } from "@prisma/client"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const rules = await prisma.escalationRule.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { logs: true } } },
  })
  return NextResponse.json(rules)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const body = await req.json()
  const updated = await prisma.escalationRule.update({
    where: { id: body.id },
    data: {
      daysThreshold: parseInt(body.daysThreshold),
      isActive: body.isActive,
      name: body.name,
    },
  })
  return NextResponse.json(updated)
}