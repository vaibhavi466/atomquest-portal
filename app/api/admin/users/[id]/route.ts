import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

// PATCH /api/admin/users/:id
// Admin updates user name, role, department, and reporting manager.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // CHANGE: Use Prisma Role enum instead of raw string.
    // This avoids accidental role comparison bugs.
    if ((session.user as any).role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // CHANGE: Next.js 16-safe params handling.
    // Your old code used params.id directly.
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    const body = await req.json()

    const name = String(body.name ?? "").trim()
    const department = String(body.department ?? "").trim() || null
    const role = body.role as Role

    // CHANGE: Convert empty managerId string to null.
    // Prisma relation fields should receive null, not "".
    const managerId = body.managerId ? String(body.managerId) : null

    if (!name) {
      return NextResponse.json(
        { error: "Full name is required" },
        { status: 400 }
      )
    }

    if (!role || !Object.values(Role).includes(role)) {
      return NextResponse.json(
        { error: "Valid role is required" },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // CHANGE: Prevent assigning user as their own manager.
    if (managerId && managerId === id) {
      return NextResponse.json(
        { error: "A user cannot be assigned as their own manager" },
        { status: 400 }
      )
    }

    // CHANGE: Validate selected manager exists and has valid role.
    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
      })

      if (!manager) {
        return NextResponse.json(
          { error: "Selected manager not found" },
          { status: 404 }
        )
      }

      if (manager.role !== Role.MANAGER && manager.role !== Role.ADMIN) {
        return NextResponse.json(
          { error: "Selected manager must be a MANAGER or ADMIN" },
          { status: 400 }
        )
      }
    }

    // CHANGE: Only EMPLOYEE users should keep managerId.
    // If user becomes MANAGER or ADMIN, managerId is cleared.
    const finalManagerId = role === Role.EMPLOYEE ? managerId : null

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name,
        role,
        department,
        managerId: finalManagerId,
      },
      // CHANGE: Return safe, useful fields only.
      // Do not return password.
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        managerId: true,
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(updated, { status: 200 })
  } catch (error) {
    console.error("ADMIN_UPDATE_USER_ERROR:", error)

    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/users/:id
// Admin deletes a user.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // CHANGE: Use Prisma Role enum for safer role check.
    if ((session.user as any).role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // CHANGE: Next.js 16-safe params handling.
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    const currentUserId = (session.user as any).id

    // CHANGE: Prevent admin from deleting their own account.
    if (id === currentUserId) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("ADMIN_DELETE_USER_ERROR:", error)

    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    )
  }
}