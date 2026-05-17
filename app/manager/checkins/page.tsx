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
import {
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Send,
  CalendarDays,
} from "lucide-react"

const QUARTERS = ["Q1", "Q2", "Q3", "Q4", "ANNUAL"] as const

const STATUS_STYLE: Record<string, string> = {
  NOT_STARTED: "bg-slate-100 text-slate-500",
  ON_TRACK: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
}

type QuarterKey = (typeof QUARTERS)[number]

// CHANGE: Added strong Checkin type.
// Reason: TIMELINE check-ins use completionDate instead of actual.
type Checkin = {
  id: string
  goalId: string
  userId: string
  quarter: string
  actual?: number | null
  completionDate?: string | Date | null
  status: string
  score?: number | null
  managerComment?: string | null
}

// CHANGE: Added strong Goal type.
// Reason: TIMELINE goals can have target = null and deadline = Date/string.
type Goal = {
  id: string
  thrustArea: string
  title: string
  description?: string | null
  uomType: string
  target?: number | null
  deadline?: string | Date | null
  weightage: number
  status: string
  checkins?: Checkin[] | null
}

// CHANGE: Added strong EmployeeReport type.
// Reason: Avoids unsafe any[] and prevents nullable target bugs.
type EmployeeReport = {
  id: string
  name: string
  email?: string | null
  department?: string | null
  goals?: Goal[] | null
}

// CHANGE: Safe initials helper.
// Reason: employee.name may be missing/null from unexpected API response.
function getInitials(name?: string | null) {
  if (!name) return "NA"
  return name.trim().slice(0, 2).toUpperCase()
}

// CHANGE: Safe UoM label helper.
// Reason: Prevents undefined label rendering when UoM type is unexpected.
function getUomLabel(uomType: string) {
  return UOM_LABELS[uomType]?.label?.split(" (")[0] || uomType
}

// CHANGE: Safe target/deadline formatter.
// Reason: goal.target.toLocaleString() crashes when target is null for TIMELINE goals.
function formatGoalTarget(goal: Goal) {
  if (goal.uomType === "TIMELINE") {
    return goal.deadline
      ? `Deadline: ${new Date(goal.deadline).toLocaleDateString("en-IN")}`
      : "Deadline: Not set"
  }

  if (goal.uomType === "ZERO") {
    return "Target: 0"
  }

  if (goal.target === null || goal.target === undefined) {
    return "Target: Not set"
  }

  return `Target: ${Number(goal.target).toLocaleString("en-IN")}`
}

// CHANGE: Safe achievement formatter.
// Reason: Numeric goals show actual, TIMELINE goals show completion date.
function formatCheckinAchievement(goal: Goal, checkin: Checkin) {
  if (goal.uomType === "TIMELINE") {
    return checkin.completionDate
      ? `Completed: ${new Date(checkin.completionDate).toLocaleDateString(
          "en-IN"
        )}`
      : "Completed: Not set"
  }

  if (checkin.actual === null || checkin.actual === undefined) {
    return null
  }

  return `Actual: ${Number(checkin.actual).toLocaleString("en-IN")}`
}

// CHANGE: Safe score checker.
// Reason: score can be null/undefined.
function hasScore(checkin: Checkin) {
  return checkin.score !== null && checkin.score !== undefined
}

export default function ManagerCheckinsPage() {
  const [reports, setReports] = useState<EmployeeReport[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [commenting, setCommenting] = useState<{
    goalId: string
    quarter: string
  } | null>(null)
  const [commentText, setCommentText] = useState("")
  const [savingComment, setSavingComment] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get("/api/manager/team-checkins")

      // CHANGE: Defensive fallback.
      // Reason: Prevents page crash if API returns unexpected response.
      const data: EmployeeReport[] = Array.isArray(res.data) ? res.data : []

      setReports(data)

      // CHANGE: Expand all employees by default safely.
      const exp: Record<string, boolean> = {}
      data.forEach((employee) => {
        exp[employee.id] = true
      })
      setExpanded(exp)
    } catch (error) {
      console.error("FETCH_TEAM_CHECKINS_ERROR:", error)

      toast.error("Failed to load team check-ins", {
        description: "Please refresh the page or try again later.",
      })

      setReports([])
    } finally {
      // CHANGE: Always stop loading.
      // Reason: Prevents infinite loading when API fails.
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function startComment(goalId: string, quarter: string, existingComment?: string | null) {
    setCommenting({ goalId, quarter })
    setCommentText(existingComment || "")
  }

  function cancelComment() {
    setCommenting(null)
    setCommentText("")
  }

  async function handleSaveComment(goalId: string, quarter: string) {
    const trimmedComment = commentText.trim()

    if (!trimmedComment) {
      toast.error("Comment cannot be empty")
      return
    }

    setSavingComment(true)

    try {
      await axios.patch(`/api/checkins/${goalId}/manager-comment`, {
        quarter,
        managerComment: trimmedComment,
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

  if (loading) {
    return (
      <div className="p-8 text-slate-400">
        Loading team check-ins...
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Team Check-ins
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Review quarterly progress and add check-in comments for your team.
        </p>
      </div>

      {reports.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
          <p className="text-slate-500 font-medium">
            No approved goals in your team yet
          </p>
          <p className="text-slate-400 text-sm mt-1">
            Approved goals and employee check-ins will appear here.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {reports.map((employee) => {
          const goals = Array.isArray(employee.goals) ? employee.goals : []
          const isExpanded = expanded[employee.id] ?? true

          // CHANGE: Safe flatMap.
          // Reason: employee.goals/checkins can be missing from API response.
          const allCheckins = goals.flatMap((goal) =>
            Array.isArray(goal.checkins) ? goal.checkins : []
          )

          const scoredCheckins = allCheckins.filter(hasScore)

          const overallScore = calculateOverallScore(
            goals.map((goal) => {
              const checkins = Array.isArray(goal.checkins)
                ? goal.checkins
                : []

              const scores = checkins
                .filter(hasScore)
                .map((checkin) => Number(checkin.score ?? 0))

              const avg =
                scores.length > 0
                  ? scores.reduce((a, b) => a + b, 0) / scores.length
                  : 0

              return {
                score: avg,
                weightage: Number(goal.weightage || 0),
              }
            })
          )

          return (
            <Card key={employee.id} className="overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs bg-slate-100">
                        {getInitials(employee.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 text-sm truncate">
                        {employee.name || "Unnamed Employee"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {goals.length} approved goals ·{" "}
                        {scoredCheckins.length} check-ins logged
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {scoredCheckins.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">
                          Overall score
                        </span>
                        <ScoreBadge score={overallScore} size="sm" />
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        setExpanded((prev) => ({
                          ...prev,
                          [employee.id]: !isExpanded,
                        }))
                      }
                    >
                      {isExpanded ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-4 space-y-5">
                  {goals.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">
                      No approved goals yet
                    </p>
                  )}

                  {goals.map((goal) => {
                    const checkins = Array.isArray(goal.checkins)
                      ? goal.checkins
                      : []

                    const checkinMap: Record<string, Checkin> = {}

                    checkins.forEach((checkin) => {
                      checkinMap[checkin.quarter] = checkin
                    })

                    const scoredGoalCheckins = checkins.filter(hasScore)

                    const avgGoalScore =
                      scoredGoalCheckins.length > 0
                        ? scoredGoalCheckins.reduce(
                            (sum, checkin) =>
                              sum + Number(checkin.score ?? 0),
                            0
                          ) / scoredGoalCheckins.length
                        : 0

                    return (
                      <div
                        key={goal.id}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 text-sm">
                              {goal.title}
                            </p>

                            {/* CHANGE: Replaced unsafe goal.target.toLocaleString().
                                Reason: TIMELINE goals have target = null and deadline instead. */}
                            <p className="text-xs text-slate-400 mt-0.5">
                              {getUomLabel(goal.uomType)} ·{" "}
                              {formatGoalTarget(goal)} ·{" "}
                              {goal.weightage}% weight
                            </p>
                          </div>

                          {scoredGoalCheckins.length > 0 && (
                            <ProgressRing
                              score={avgGoalScore}
                              size={48}
                              strokeWidth={4}
                            />
                          )}
                        </div>

                        {/* CHANGE: Responsive grid.
                            Reason: fixed grid-cols-5 can overflow on smaller screens. */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                          {QUARTERS.map((quarter: QuarterKey) => {
                            const checkin = checkinMap[quarter]
                            const isCommenting =
                              commenting?.goalId === goal.id &&
                              commenting?.quarter === quarter

                            const achievementText = checkin
                              ? formatCheckinAchievement(goal, checkin)
                              : null

                            return (
                              <div
                                key={quarter}
                                className={`rounded-lg border p-2.5 ${
                                  checkin
                                    ? "border-slate-200 bg-white"
                                    : "border-dashed border-slate-200 bg-slate-50"
                                }`}
                              >
                                <p className="text-xs font-semibold text-slate-700 mb-1.5">
                                  {quarter}
                                </p>

                                {checkin ? (
                                  <>
                                    <span
                                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                        STATUS_STYLE[checkin.status] ||
                                        STATUS_STYLE.NOT_STARTED
                                      }`}
                                    >
                                      {checkin.status === "NOT_STARTED"
                                        ? "Not Started"
                                        : checkin.status === "ON_TRACK"
                                          ? "On Track"
                                          : "Done"}
                                    </span>

                                    {/* CHANGE: Shows actual for numeric goals and completion date for TIMELINE goals. */}
                                    {achievementText && (
                                      <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                                        {goal.uomType === "TIMELINE" && (
                                          <CalendarDays size={11} />
                                        )}
                                        <span>{achievementText}</span>
                                      </p>
                                    )}

                                    {checkin.score !== null &&
                                      checkin.score !== undefined && (
                                        <div className="mt-1.5">
                                          <ScoreBadge
                                            score={Number(checkin.score)}
                                            size="sm"
                                          />
                                        </div>
                                      )}

                                    {isCommenting ? (
                                      <div className="mt-2 space-y-1.5">
                                        <Textarea
                                          placeholder="Add your feedback..."
                                          value={commentText}
                                          onChange={(event) =>
                                            setCommentText(event.target.value)
                                          }
                                          rows={2}
                                          className="text-xs"
                                        />

                                        <div className="flex gap-1">
                                          <Button
                                            size="sm"
                                            className="h-6 text-xs flex-1"
                                            onClick={() =>
                                              handleSaveComment(
                                                goal.id,
                                                quarter
                                              )
                                            }
                                            disabled={savingComment}
                                          >
                                            <Send
                                              size={10}
                                              className="mr-1"
                                            />
                                            Save
                                          </Button>

                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-6 text-xs flex-1"
                                            onClick={cancelComment}
                                            disabled={savingComment}
                                          >
                                            Cancel
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="mt-2 space-y-1.5">
                                        {checkin.managerComment ? (
                                          <div className="text-xs bg-blue-50 border border-blue-100 text-blue-700 rounded-md px-2 py-1.5">
                                            <div className="flex items-center gap-1 font-medium mb-0.5">
                                              <MessageSquare size={11} />
                                              Comment
                                            </div>
                                            <p>{checkin.managerComment}</p>
                                          </div>
                                        ) : null}

                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 text-xs w-full text-slate-500 hover:text-slate-800"
                                          onClick={() =>
                                            startComment(
                                              goal.id,
                                              quarter,
                                              checkin.managerComment
                                            )
                                          }
                                        >
                                          <MessageSquare
                                            size={11}
                                            className="mr-1"
                                          />
                                          {checkin.managerComment
                                            ? "Edit comment"
                                            : "Add comment"}
                                        </Button>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-xs text-slate-400">
                                    No check-in yet
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