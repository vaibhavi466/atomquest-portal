import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { Role } from "@prisma/client"

// GET /api/admin/users — fetch all users
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      managerId: true,
      manager: { select: { name: true } },
      _count: { select: { goals: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(users)
}

// POST /api/admin/users — create new user
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()

  const existing = await prisma.user.findUnique({ where: { email: body.email } })
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 400 })
  }

  const password = await bcrypt.hash(body.password || "Demo@123", 12)

  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      password,
      role: body.role as Role,
      department: body.department || null,
      managerId: body.managerId || null,
    },
  })

  return NextResponse.json(user, { status: 201 })
}