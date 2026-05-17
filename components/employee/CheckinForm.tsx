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
  { value: "ON_TRACK",    label: "On Track"    },
  { value: "COMPLETED",   label: "Completed"   },
]

interface CheckinFormProps {
  goal: {
    id: string
    title: string
    uomType: string
    target?: number | null
    deadline?: string | null
  }
  quarter: string
  existing?: {
    actual?: number | null
    completionDate?: string | null
    status: string
    score?: number | null
    managerComment?: string | null
  }
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function CheckinForm({
  goal,
  quarter,
  existing,
  onSubmit,
  onCancel,
  isLoading,
}: CheckinFormProps) {
  const [actual, setActual] = useState(existing?.actual?.toString() || "")
  const [completionDate, setCompletionDate] = useState(
    existing?.completionDate
      ? new Date(existing.completionDate).toISOString().split("T")[0]
      : ""
  )
  const [status, setStatus] = useState(existing?.status || "NOT_STARTED")

  // Live score preview
  const previewScore = calculateScore(
    goal.uomType,
    goal.target ?? null,
    actual !== "" ? parseFloat(actual) : null,
    goal.uomType === "TIMELINE" && goal.deadline ? new Date(goal.deadline) : null,
    goal.uomType === "TIMELINE" && completionDate ? new Date(completionDate) : null
  )

  const showActual = goal.uomType !== "TIMELINE"
  const showDate = goal.uomType === "TIMELINE"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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
          {UOM_LABELS[goal.uomType]?.label?.split(" (")[0]} ·{" "}
          {goal.uomType === "TIMELINE"
            ? `Deadline: ${goal.deadline ? new Date(goal.deadline).toLocaleDateString() : "Not set"}`
            : `Target: ${(goal.target ?? 0).toLocaleString()}`
          }
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
            placeholder={`e.g. ${Math.round((goal.target ?? 0) * 0.8)}`}
            value={actual}
            onChange={(e) => setActual(e.target.value)}
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
          />
          <p className="text-xs text-slate-400">
            Date you completed or expect to complete this goal
          </p>
        </div>
      )}

      {/* Status */}
      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select value={status} onValueChange={(value) => {
          if (value !== null) {
            setStatus(value); // Only call setStatus if value is not null
          }
        }}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
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
            <span className="text-sm text-slate-600">Computed score preview</span>
          </div>
          <ScoreBadge score={previewScore} size="md" showLabel />
        </div>
      )}

      {/* Manager comment (read-only for employee) */}
      {existing?.managerComment && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
          <p className="text-xs font-medium text-blue-700 mb-1">Manager comment</p>
          <p className="text-sm text-blue-800">{existing.managerComment}</p>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Saving..." : existing ? "Update Check-in" : "Save Check-in"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}