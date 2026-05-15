import { auth } from "@/app/api/auth/[...nextauth]/route"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth
  const role = (req.auth?.user as any)?.role

  // Public routes
  if (pathname === "/login" || pathname === "/") {
    if (isLoggedIn) {
      // Redirect to role-based dashboard
      if (role === "ADMIN") return NextResponse.redirect(new URL("/admin/dashboard", req.url))
      if (role === "MANAGER") return NextResponse.redirect(new URL("/manager/dashboard", req.url))
      return NextResponse.redirect(new URL("/employee/dashboard", req.url))
    }
    return NextResponse.next()
  }

  // Protected routes — must be logged in
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Role enforcement
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", req.url))
  }
  if (pathname.startsWith("/manager") && role !== "MANAGER" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}