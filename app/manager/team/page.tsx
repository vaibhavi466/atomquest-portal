"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmployeeGoalReview } from "@/components/manager/EmployeeGoalReview"
import { Users, Clock } from "lucide-react"
import { toast } from "sonner"

type Goal = {
  id: string
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "RETURNED" | "LOCKED"
  thrustArea: string
  title: string
  description?: string | null
  uomType: string
  target?: number | null
  deadline?: string | Date | null
  weightage: number
  isShared?: boolean
}

type Report = {
  id: string
  name: string
  email: string
  department?: string | null
  goals: Goal[]
}


export default function TeamGoalsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTeam = useCallback(async () => {
    try {
      setLoading(true)

      const res = await axios.get<Report[]>("/api/manager/team-goals")
      setReports(Array.isArray(res.data) ? res.data : [])
    } catch (err: any) {
        toast.error("Failed to load team goals", {
            description:
            err.response?.data?.error || "Please refresh the page and try again.",
        })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTeam()
  }, [fetchTeam])

  const pendingReports = reports.filter((report) =>
    report.goals?.some((goal) => goal.status === "SUBMITTED")
  )

  if (loading) {
    return (
      <div className="p-8 text-slate-400">
        Loading team goals...
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Team Goals
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Review, edit, approve, or return goals from your direct reports
        </p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="mb-6">
          <TabsTrigger value="pending">
            Pending Approval
            {pendingReports.length > 0 && (
              <span className="ml-2 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">
                {pendingReports.length}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="all">
            All Team Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingReports.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
              <Clock size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">
                No goals pending approval
              </p>
              <p className="text-slate-400 text-sm mt-1">
                All submitted goals have been reviewed
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {pendingReports.map((report) => (
                <EmployeeGoalReview
                  key={report.id}
                  employee={report}
                  onUpdate={fetchTeam}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all">
          {reports.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
              <Users size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">
                No team members assigned
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {reports.map((report) => (
                <EmployeeGoalReview
                  key={report.id}
                  employee={report}
                  onUpdate={fetchTeam}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}