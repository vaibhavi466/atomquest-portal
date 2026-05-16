import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { GoalStatus } from "@prisma/client"
import * as XLSX from "xlsx"
import { calculateOverallScore } from "@/lib/calculations"

// GET /api/admin/reports/export
// Generates and returns an Excel file (.xlsx)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as any).role
  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const managerId = (session.user as any).id
  const whereClause = role === "ADMIN" ? {} : { managerId }

  const users = await prisma.user.findMany({
    where: { ...whereClause, role: { in: ["EMPLOYEE", "MANAGER"] } },
    include: {
      manager: { select: { name: true } },
      goals: {
        include: { checkins: { orderBy: { quarter: "asc" } } },
      },
    },
    orderBy: { name: "asc" },
  })

  // ─── Sheet 1: Summary ───────────────────────────────────────────────────────
  const summaryRows: any[] = []
  users.forEach((user) => {
    const lockedGoals = user.goals.filter((g) => g.status === GoalStatus.LOCKED)
    const overallScore = calculateOverallScore(
      lockedGoals.map((g) => {
        const scored = g.checkins.filter((c) => c.score !== null)
        const avg =
          scored.length > 0
            ? scored.reduce((s, c) => s + (c.score as number), 0) / scored.length
            : 0
        return { score: avg, weightage: g.weightage }
      })
    )

    summaryRows.push({
      "Employee Name": user.name,
      "Email": user.email,
      "Department": user.department || "N/A",
      "Manager": user.manager?.name || "N/A",
      "Total Goals": user.goals.length,
      "Approved Goals": lockedGoals.length,
      "Goals Pending": user.goals.filter((g) => g.status === GoalStatus.SUBMITTED).length,
      "Check-ins Logged": user.goals.reduce((s, g) => s + g.checkins.length, 0),
      "Overall Score (%)": overallScore,
    })
  })

  // ─── Sheet 2: Detailed Goal-wise Report ────────────────────────────────────
  const detailRows: any[] = []
  users.forEach((user) => {
    user.goals.forEach((goal) => {
      const checkinMap: Record<string, any> = {}
      goal.checkins.forEach((c) => { checkinMap[c.quarter] = c })

      detailRows.push({
        "Employee Name": user.name,
        "Department": user.department || "N/A",
        "Manager": user.manager?.name || "N/A",
        "Thrust Area": goal.thrustArea,
        "Goal Title": goal.title,
        "UoM Type": goal.uomType,
        "Target": goal.target,
        "Weightage (%)": goal.weightage,
        "Goal Status": goal.status,
        "Shared Goal": goal.isShared ? "Yes" : "No",
        "Q1 Actual": checkinMap["Q1"]?.actual ?? "",
        "Q1 Score (%)": checkinMap["Q1"]?.score ?? "",
        "Q1 Status": checkinMap["Q1"]?.status ?? "NOT_STARTED",
        "Q1 Manager Comment": checkinMap["Q1"]?.managerComment ?? "",
        "Q2 Actual": checkinMap["Q2"]?.actual ?? "",
        "Q2 Score (%)": checkinMap["Q2"]?.score ?? "",
        "Q2 Status": checkinMap["Q2"]?.status ?? "NOT_STARTED",
        "Q2 Manager Comment": checkinMap["Q2"]?.managerComment ?? "",
        "Q3 Actual": checkinMap["Q3"]?.actual ?? "",
        "Q3 Score (%)": checkinMap["Q3"]?.score ?? "",
        "Q3 Status": checkinMap["Q3"]?.status ?? "NOT_STARTED",
        "Q3 Manager Comment": checkinMap["Q3"]?.managerComment ?? "",
        "Q4 Actual": checkinMap["Q4"]?.actual ?? "",
        "Q4 Score (%)": checkinMap["Q4"]?.score ?? "",
        "Q4 Status": checkinMap["Q4"]?.status ?? "NOT_STARTED",
        "Q4 Manager Comment": checkinMap["Q4"]?.managerComment ?? "",
      })
    })
  })

  // ─── Sheet 3: Audit Trail ──────────────────────────────────────────────────
  const auditLogs = await prisma.auditLog.findMany({
    where: { goal: { user: whereClause } },
    include: {
      goal: { select: { title: true, user: { select: { name: true } } } },
      changedBy: { select: { name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  })

  const auditRows = auditLogs.map((log) => ({
    "Date & Time": new Date(log.createdAt).toLocaleString("en-IN"),
    "Employee": log.goal.user.name,
    "Goal Title": log.goal.title,
    "Changed By": log.changedBy.name,
    "Role": log.changedBy.role,
    "Field Changed": log.field,
    "Old Value": log.oldValue,
    "New Value": log.newValue,
    "Reason": log.reason || "",
  }))

  // ─── Build Workbook ────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new()

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows)
  const wsDetail = XLSX.utils.json_to_sheet(detailRows)
  const wsAudit = XLSX.utils.json_to_sheet(auditRows.length > 0 ? auditRows : [{ "Note": "No audit logs yet" }])

  // Style column widths
  wsSummary["!cols"] = [
    { wch: 20 }, { wch: 28 }, { wch: 16 }, { wch: 20 },
    { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 18 },
  ]
  wsDetail["!cols"] = Array(26).fill({ wch: 18 })
  wsAudit["!cols"] = [
    { wch: 20 }, { wch: 16 }, { wch: 30 }, { wch: 16 },
    { wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 30 },
  ]

  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary")
  XLSX.utils.book_append_sheet(wb, wsDetail, "Goal Details")
  XLSX.utils.book_append_sheet(wb, wsAudit, "Audit Trail")

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="GoalTrack_Achievement_Report_${
        new Date().toISOString().split("T")[0]
      }.xlsx"`,
    },
  })
}