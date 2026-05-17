import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { runEscalationCheck } from "@/lib/escalation"

// POST /api/admin/escalation/run — manually trigger escalation check
// Also called by Vercel Cron Job
export async function POST(req: NextRequest) {
  // Allow both admin users AND Vercel Cron (via Authorization header)
  const authHeader = req.headers.get("authorization")
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`

  if (!isCron) {
    const session = await auth()
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const result = await runEscalationCheck()
  return NextResponse.json(result)
}