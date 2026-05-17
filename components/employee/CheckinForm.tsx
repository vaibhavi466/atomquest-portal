"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { calculateScore, UOM_LABELS } from "@/lib/calculations"
import { ScoreBadge } from "@/components/shared/ScoreBadge"
import { Zap } from "lucide-react"

const STATUS_OPTIONS = [
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "ON_TRACK", label: "On Track" },
  { value: "COMPLETED", label: "Completed" },
]

interface CheckinFormProps {
  goal: {
    id: string
    title: string
    uomType: string

    // CHANGE: target can be null for TIMELINE goals.
    target?: number | null

    // CHANGE: parent components/API may pass Date or string.
    deadline?: string | Date | null
  }
  quarter: string
  existing?: {
    id?: string
    goalId?: string
    userId?: string
    quarter?: string
    actual?: number | null

    // CHANGE: completionDate may be Date or string depending on API/client state.
    completionDate?: string | Date | null

    status: string
    score?: number | null
    managerComment?: string | null
  }
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

// CHANGE: Safe date-to-input formatter.
// Reason: avoids invalid Date parsing crashing the form.
function formatDateForInput(value?: string | Date | null) {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return date.toISOString().split("T")[0]
}

// CHANGE: Safe target/deadline formatter.
// Reason: TIMELINE goals have target=null, so target.toLocaleString() must never be used directly.
function formatGoalTarget(goal: CheckinFormProps["goal"]) {
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

export function CheckinForm({
  goal,
  quarter,
  existing,
  onSubmit,
  onCancel,
  isLoading,
}: CheckinFormProps) {
  const [actual, setActual] = useState(
    existing?.actual !== null && existing?.actual !== undefined
      ? existing.actual.toString()
      : ""
  )

  // CHANGE: Uses safe date formatter.
  const [completionDate, setCompletionDate] = useState(
    formatDateForInput(existing?.completionDate)
  )

  const [status, setStatus] = useState(existing?.status || "NOT_STARTED")

  const showActual = goal.uomType !== "TIMELINE"
  const showDate = goal.uomType === "TIMELINE"

  // CHANGE: Safe score preview for both numeric and TIMELINE goals.
  const previewScore = calculateScore(
    goal.uomType,
    goal.target ?? null,
    actual !== "" ? parseFloat(actual) : null,
    goal.uomType === "TIMELINE" && goal.deadline ? new Date(goal.deadline) : null,
    goal.uomType === "TIMELINE" && completionDate ? new Date(completionDate) : null
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    // CHANGE: Frontend validation before hitting API.
    if (showActual && actual === "") {
      return
    }

    if (showDate && completionDate === "") {
      return
    }

    await onSubmit({
      quarter,
      actual: showActual && actual !== "" ? parseFloat(actual) : undefined,
      completionDate: showDate && completionDate ? completionDate : undefined,
      status,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Goal context */}
      <div className="bg-slate-50 rounded-lg px-3 py-2.5">
        <p className="text-xs text-slate-500">Goal</p>
        <p className="text-sm font-medium text-slate-800">{goal.title}</p>

        <p className="text-xs text-slate-400 mt-0.5">
          {UOM_LABELS[goal.uomType]?.label?.split(" (")[0] || goal.uomType} ·{" "}
          {formatGoalTarget(goal)}
        </p>
      </div>

      {/* Actual / Completion Date */}
      {showActual && (
        <div className="space-y-1.5">
          <Label>
            Actual Achievement
            <span className="text-red-500 ml-0.5">*</span>
          </Label>

          <Input
            type="number"
            step="any"
            placeholder={
              goal.target !== null && goal.target !== undefined
                ? `e.g. ${Math.round(Number(goal.target) * 0.8)}`
                : "Enter actual achievement"
            }
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            required
          />

          <p className="text-xs text-slate-400">
            Enter the actual value achieved so far this quarter
          </p>
        </div>
      )}

      {showDate && (
        <div className="space-y-1.5">
          <Label>
            Completion Date
            <span className="text-red-500 ml-0.5">*</span>
          </Label>

          <Input
            type="date"
            value={completionDate}
            onChange={(e) => setCompletionDate(e.target.value)}
            required
          />

          <p className="text-xs text-slate-400">
            Date you completed or expect to complete this goal
          </p>
        </div>
      )}

      {/* Status */}
      <div className="space-y-1.5">
        <Label>Status</Label>

        <Select
          value={status}
          onValueChange={(value) => {
            // CHANGE: custom Select may return null, so guard it.
            if (value) setStatus(value)
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Live Score Preview */}
      {(actual !== "" || completionDate !== "") && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-amber-500" />
            <span className="text-sm text-slate-600">
              Computed score preview
            </span>
          </div>

          <ScoreBadge score={previewScore} size="md" showLabel />
        </div>
      )}

      {/* Manager comment */}
      {existing?.managerComment && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
          <p className="text-xs font-medium text-blue-700 mb-1">
            Manager comment
          </p>
          <p className="text-sm text-blue-800">{existing.managerComment}</p>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading
            ? "Saving..."
            : existing
              ? "Update Check-in"
              : "Save Check-in"}
        </Button>

        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}