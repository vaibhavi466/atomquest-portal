"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { toast } from "sonner"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScoreBadge } from "@/components/shared/ScoreBadge"
import { ProgressRing } from "@/components/shared/ProgressRing"
import { UOM_LABELS, calculateOverallScore } from "@/lib/calculations"
import { MessageSquare, ChevronDown, ChevronUp, Send } from "lucide-react"

const QUARTERS = ["Q1", "Q2", "Q3", "Q4", "ANNUAL"]

const STATUS_STYLE: Record<string, string> = {
  NOT_STARTED: "bg-slate-100 text-slate-500",
  ON_TRACK:    "bg-amber-100 text-amber-700",
  COMPLETED:   "bg-green-100 text-green-700",
}

export default function ManagerCheckinsPage() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [commenting, setCommenting] = useState<{
    goalId: string
    quarter: string
  } | null>(null)
  const [commentText, setCommentText] = useState("")
  const [savingComment, setSavingComment] = useState(false)

  const fetchData = useCallback(async () => {
    const res = await axios.get("/api/manager/team-checkins")
    setReports(res.data)
    // Expand all by default
    const exp: Record<string, boolean> = {}
    res.data.forEach((r: any) => { exp[r.id] = true })
    setExpanded(exp)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSaveComment(goalId: string, quarter: string) {
    setSavingComment(true)
    try {
      await axios.patch(`/api/checkins/${goalId}/manager-comment`, {
        quarter,
        managerComment: commentText,
      })
      await fetchData()
      setCommenting(null)
      setCommentText("")
      toast.success("Comment saved", {
        description: "Employee will see your feedback on their check-in.",
      })
    } catch (err: any) {
      toast.error("Failed to save comment", {
        description: err.response?.data?.error || "Please try again.",
      })
    } finally {
      setSavingComment(false)
    }
  }

  if (loading) return <div className="p-8 text-slate-400">Loading team check-ins...</div>

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Team Check-ins</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Review quarterly progress and add check-in comments for your team.
        </p>
      </div>

      {reports.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
          <p className="text-slate-500 font-medium">No approved goals in your team yet</p>
        </div>
      )}

      <div className="space-y-6">
        {reports.map((employee) => {
          const isExpanded = expanded[employee.id]
          const allCheckins = employee.goals.flatMap((g: any) => g.checkins)
          const scoredCheckins = allCheckins.filter((c: any) => c.score !== null)
          const overallScore = calculateOverallScore(
            employee.goals.map((g: any) => {
              const scores = g.checkins
                .filter((c: any) => c.score !== null)
                .map((c: any) => c.score as number)
              const avg =
                scores.length > 0
                  ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
                  : 0
              return { score: avg, weightage: g.weightage }
            })
          )

          return (
            <Card key={employee.id} className="overflow-hidden">
              {/* Employee header */}
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs bg-slate-100">
                        {employee.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{employee.name}</p>
                      <p className="text-xs text-slate-400">
                        {employee.goals.length} approved goals ·{" "}
                        {scoredCheckins.length} check-ins logged
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {scoredCheckins.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Overall score</span>
                        <ScoreBadge score={overallScore} size="sm" />
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        setExpanded((prev) => ({ ...prev, [employee.id]: !prev[employee.id] }))
                      }
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Goals + check-ins */}
              {isExpanded && (
                <CardContent className="pt-4 space-y-5">
                  {employee.goals.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">
                      No approved goals yet
                    </p>
                  )}

                  {employee.goals.map((goal: any) => {
                    const checkinMap: Record<string, any> = {}
                    goal.checkins.forEach((c: any) => {
                      checkinMap[c.quarter] = c
                    })

                    const scoredG = goal.checkins.filter(
                      (c: any) => c.score !== null
                    )
                    const avgG =
                      scoredG.length > 0
                        ? scoredG.reduce((s: number, c: any) => s + c.score, 0) /
                          scoredG.length
                        : 0

                    return (
                      <div
                        key={goal.id}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        {/* Goal header */}
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <p className="font-medium text-slate-900 text-sm">
                              {goal.title}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {UOM_LABELS[goal.uomType]?.label?.split(" (")[0]} ·
                              Target: {goal.target.toLocaleString()} ·{" "}
                              {goal.weightage}% weight
                            </p>
                          </div>
                          {scoredG.length > 0 && (
                            <ProgressRing score={avgG} size={48} strokeWidth={4} />
                          )}
                        </div>

                        {/* Quarter columns */}
                        <div className="grid grid-cols-5 gap-2">
                          {QUARTERS.map((q) => {
                            const checkin = checkinMap[q]
                            const isCommenting =
                              commenting?.goalId === goal.id &&
                              commenting?.quarter === q

                            return (
                              <div
                                key={q}
                                className={`rounded-lg border p-2.5 ${
                                  checkin
                                    ? "border-slate-200 bg-white"
                                    : "border-dashed border-slate-200 bg-slate-50"
                                }`}
                              >
                                <p className="text-xs font-semibold text-slate-700 mb-1.5">
                                  {q}
                                </p>

                                {checkin ? (
                                  <>
                                    <span
                                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                        STATUS_STYLE[checkin.status]
                                      }`}
                                    >
                                      {checkin.status === "NOT_STARTED"
                                        ? "Not Started"
                                        : checkin.status === "ON_TRACK"
                                        ? "On Track"
                                        : "Done"}
                                    </span>

                                    {checkin.actual !== null &&
                                      checkin.actual !== undefined && (
                                        <p className="text-xs text-slate-500 mt-1.5">
                                          {Number(checkin.actual).toLocaleString()}
                                        </p>
                                      )}

                                    {checkin.score !== null && (
                                      <div className="mt-1.5">
                                        <ScoreBadge score={checkin.score} size="sm" />
                                      </div>
                                    )}

                                    {/* Comment section */}
                                    {isCommenting ? (
                                      <div className="mt-2 space-y-1.5">
                                        <Textarea
                                          placeholder="Add your feedback..."
                                          value={commentText}
                                          onChange={(e) =>
                                            setCommentText(e.target.value)
                                          }
                                          rows={2}
                                          className="text-xs"
                                        />
                                        <div className="flex gap-1">
                                          <Button
                                            size="sm"
                                            className="h-6 text-xs flex-1"
                                            onClick={() =>
                                              handleSaveComment(goal.id, q)
                                            }
                                            disabled={savingComment}
                                          >
                                            <Send size={10} className="mr-1" />
                                            Save
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 text-xs"
                                            onClick={() => setCommenting(null)}
                                          >
                                            ✕
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="mt-2">
                                        {checkin.managerComment && (
                                          <p className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 mb-1.5 line-clamp-2">
                                            {checkin.managerComment}
                                          </p>
                                        )}
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 text-xs w-full text-slate-400 hover:text-blue-600"
                                          onClick={() => {
                                            setCommenting({
                                              goalId: goal.id,
                                              quarter: q,
                                            })
                                            setCommentText(
                                              checkin.managerComment || ""
                                            )
                                          }}
                                        >
                                          <MessageSquare size={10} className="mr-1" />
                                          {checkin.managerComment ? "Edit" : "Comment"}
                                        </Button>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-xs text-slate-400 mt-1">
                                    No entry
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}