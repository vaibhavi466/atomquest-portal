"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, Download, CheckCircle } from "lucide-react"

export default function ExportPage() {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/reports/export")
      if (!response.ok) throw new Error("Export failed")

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `GoalTrack_Achievement_Report_${
        new Date().toISOString().split("T")[0]
      }.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success("Report downloaded", {
        description: "Excel file with 3 sheets: Summary, Goal Details, Audit Trail.",
      })
    } catch {
      toast.error("Export failed", {
        description: "Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Export Data</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Download the full achievement report as an Excel file
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-700">
            Achievement Report (.xlsx)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* What's included */}
          <div className="space-y-2">
            {[
              "Sheet 1 — Summary: one row per employee with overall score",
              "Sheet 2 — Goal Details: every goal with Q1–Q4 actuals and scores",
              "Sheet 3 — Audit Trail: full change history with timestamps",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <CheckCircle
                  size={14}
                  className="text-green-500 mt-0.5 shrink-0"
                />
                <p className="text-sm text-slate-600">{item}</p>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 rounded-lg px-4 py-3">
            <p className="text-xs text-slate-500">
              The report includes all employees, their goals, planned vs actual
              values, computed scores, manager comments, and a full audit trail —
              ready for HR and leadership review.
            </p>
          </div>

          <Button
            onClick={handleExport}
            disabled={loading}
            className="w-full gap-2"
            size="lg"
          >
            {loading ? (
              <>Generating report...</>
            ) : (
              <>
                <Download size={16} />
                Download Excel Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}