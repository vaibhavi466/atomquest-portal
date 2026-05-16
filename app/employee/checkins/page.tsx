"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { toast } from "sonner"
import { CheckinForm } from "@/components/employee/CheckinForm"
import { ScoreBadge } from "@/components/shared/ScoreBadge"
import { ProgressRing } from "@/components/shared/ProgressRing"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { UOM_LABELS } from "@/lib/calculations"
import { calculateScore } from "@/lib/calculations"
import { Pencil, Plus, Lock, MessageSquare } from "lucide-react"

const QUARTERS = [
  { key: "Q1", label: "Q1", period: "Jul – Sep" },
  { key: "Q2", label: "Q2", period: "Oct – Dec" },
  { key: "Q3", label: "Q3", period: "Jan – Mar" },
  { key: "Q4", label: "Q4", period: "Mar – Apr" },
  { key: "ANNUAL", label: "Annual", period: "Full Year" },
]

const STATUS_STYLE: Record<string, string> = {
  NOT_STARTED: "bg-slate-100 text-slate-500",
  ON_TRACK:    "bg-amber-100 text-amber-700",
  COMPLETED:   "bg-green-100 text-green-700",
}

export default function CheckinsPage() {
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCheckin, setActiveCheckin] = useState<{
    goal: any
    quarter: string
    existing?: any
  } | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const fetchGoals = useCallback(async () => {
    const res = await axios.get("/api/checkins")
    setGoals(res.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  async function handleCheckinSubmit(data: any) {
    if (!activeCheckin) return
    setFormLoading(true)
    try {
      await axios.post(`/api/checkins/${activeCheckin.goal.id}`, data)
      await fetchGoals()
      setActiveCheckin(null)
      toast.success("Check-in saved", {
        description: "Progress score updated automatically.",
      })
    } catch (err: any) {
      toast.error("Failed to save", {
        description: err.response?.data?.error || "Please try again.",
      })
    } finally {
      setFormLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-slate-400">Loading check-ins...</div>

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Quarterly Check-ins</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Log your actual achievement per quarter. Scores are computed automatically.
        </p>
      </div>

      {goals.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
          <Lock size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No approved goals yet</p>
          <p className="text-slate-400 text-sm mt-1">
            Goals must be approved by your manager before check-ins are available
          </p>
        </div>
      )}

      <div className="space-y-6">
        {goals.map((goal) => {
          // Build checkin map by quarter
          const checkinMap: Record<string, any> = {}
          goal.checkins.forEach((c: any) => {
            checkinMap[c.quarter] = c
          })

          // Compute average score across completed checkins
          const scoredCheckins = goal.checkins.filter(
            (c: any) => c.score !== null && c.score !== undefined
          )
          const avgScore =
            scoredCheckins.length > 0
              ? scoredCheckins.reduce((s: number, c: any) => s + c.score, 0) /
                scoredCheckins.length
              : 0

          return (
            <Card key={goal.id}>
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {goal.thrustArea}
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {UOM_LABELS[goal.uomType]?.label?.split(" (")[0]}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {goal.weightage}% weight
                      </span>
                    </div>
                    <p className="font-medium text-slate-900">{goal.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Target: {goal.target.toLocaleString()}
                    </p>
                  </div>

                  {/* Avg score ring */}
                  {scoredCheckins.length > 0 && (
                    <ProgressRing score={avgScore} size={56} strokeWidth={5} />
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                {/* Quarter grid */}
                <div className="grid grid-cols-5 gap-3">
                  {QUARTERS.map(({ key, label, period }) => {
                    const checkin = checkinMap[key]
                    const hasCheckin = !!checkin
                    const score = checkin?.score ?? null

                    return (
                      <div
                        key={key}
                        className={`rounded-xl border p-3 transition-all ${
                          hasCheckin
                            ? "border-slate-200 bg-white"
                            : "border-dashed border-slate-200 bg-slate-50/50"
                        }`}
                      >
                        {/* Quarter label */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-700">{label}</span>
                          <span className="text-xs text-slate-400">{period}</span>
                        </div>

                        {hasCheckin ? (
                          <>
                            {/* Status pill */}
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                STATUS_STYLE[checkin.status]
                              }`}
                            >
                              {checkin.status === "NOT_STARTED"
                                ? "Not Started"
                                : checkin.status === "ON_TRACK"
                                ? "On Track"
                                : "Completed"}
                            </span>

                            {/* Actual value */}
                            {checkin.actual !== null && checkin.actual !== undefined && (
                              <p className="text-xs text-slate-500 mt-2">
                                Actual:{" "}
                                <span className="font-medium text-slate-800">
                                  {Number(checkin.actual).toLocaleString()}
                                </span>
                              </p>
                            )}

                            {/* Score */}
                            {score !== null && (
                              <div className="mt-2">
                                <ScoreBadge score={score} size="sm" />
                              </div>
                            )}

                            {/* Manager comment indicator */}
                            {checkin.managerComment && (
                              <div className="mt-2 flex items-center gap-1 text-blue-600">
                                <MessageSquare size={11} />
                                <span className="text-xs">Manager comment</span>
                              </div>
                            )}

                            {/* Edit button */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="mt-2 h-6 text-xs w-full text-slate-500 hover:text-slate-800"
                              onClick={() =>
                                setActiveCheckin({ goal, quarter: key, existing: checkin })
                              }
                            >
                              <Pencil size={11} className="mr-1" />
                              Edit
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mt-1 h-7 text-xs w-full text-slate-400 hover:text-slate-700 border border-dashed border-slate-300 hover:border-slate-400"
                            onClick={() =>
                              setActiveCheckin({ goal, quarter: key, existing: undefined })
                            }
                          >
                            <Plus size={11} className="mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Check-in Dialog */}
      <Dialog
        open={!!activeCheckin}
        onOpenChange={() => setActiveCheckin(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {activeCheckin?.existing ? "Edit Check-in" : "Add Check-in"} —{" "}
              {activeCheckin?.quarter}
            </DialogTitle>
          </DialogHeader>
          {activeCheckin && (
            <CheckinForm
              goal={activeCheckin.goal}
              quarter={activeCheckin.quarter}
              existing={activeCheckin.existing}
              onSubmit={handleCheckinSubmit}
              onCancel={() => setActiveCheckin(null)}
              isLoading={formLoading}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}