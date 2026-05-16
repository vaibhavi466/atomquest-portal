"use client"

import { useState, type SyntheticEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UOM_LABELS } from "@/lib/calculations"

const THRUST_AREAS = [
  "Revenue Growth",
  "Customer Success",
  "Operational Efficiency",
  "Safety",
  "Learning & Development",
  "Innovation",
  "People & Culture",
  "Compliance & Risk",
]

interface GoalFormProps {
  initialData?: {
    id?: string
    thrustArea: string
    title: string
    description: string
    uomType: string
    target: number
    weightage: number
    isShared?: boolean
  }
  remainingWeightage: number
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function GoalForm({
  initialData,
  remainingWeightage,
  onSubmit,
  onCancel,
  isLoading,
}: GoalFormProps) {
  const isEditMode = Boolean(initialData?.id)
  const isSharedGoal = Boolean(initialData?.isShared)

  const [form, setForm] = useState({
    thrustArea: initialData?.thrustArea || "",
    title: initialData?.title || "",
    description: initialData?.description || "",
    uomType: initialData?.uomType || "",
    target: initialData?.target !== undefined ? initialData.target.toString() : "",
    weightage: initialData?.weightage !== undefined ? initialData.weightage.toString() : "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!form.thrustArea) e.thrustArea = "Required"
    if (!form.title.trim()) e.title = "Required"
    if (!form.uomType) e.uomType = "Required"

    if (form.target === "" || Number.isNaN(Number(form.target))) e.target = "Enter a valid number"
    
    if (form.uomType === "ZERO" && Number(form.target) !== 0) {
      e.target = "ZERO type goals must have target 0"
    }
    
    if (form.weightage === "" || Number.isNaN(Number(form.weightage)))  {
      e.weightage = "Required"
    } else if (Number(form.weightage) < 10) {
      e.weightage = "Minimum 10% required"
    } else if (Number(form.weightage) > 100) {
      e.weightage = "Cannot exceed 100%"
    } else if (Number(form.weightage) > remainingWeightage) {
      // CHANGE: Prevent employee from entering more than available remaining weightage
      e.weightage = `Cannot exceed remaining ${remainingWeightage.toFixed(1)}%`
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validate()) return

    if (isSharedGoal) {
      await onSubmit({
        weightage: form.weightage,
      })
      return
    }

    await onSubmit(form)
  }

  const uomInfo = UOM_LABELS[form.uomType]
  const lockedFieldClass = isSharedGoal
    ? "bg-slate-100 text-slate-500 cursor-not-allowed opacity-80"
    : ""

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {isSharedGoal && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
          <p className="text-xs text-blue-700">
            This is a shared goal pushed by your manager. Goal details and target
            are locked. You can only update the weightage.
          </p>
        </div>
      )}

      {/* Thrust Area */}
      <div className="space-y-1.5">
        <Label>Thrust Area <span className="text-red-500">*</span></Label>

        <Select value={form.thrustArea} disabled={isSharedGoal} onValueChange={(v) => setForm({ ...form, thrustArea: v ?? "" })}>
          <SelectTrigger className={errors.thrustArea ? "border-red-400" : ""}>
            <SelectValue placeholder="Select thrust area" />
          </SelectTrigger>
          <SelectContent>
            {THRUST_AREAS.map((area) => (
              <SelectItem key={area} value={area}>{area}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.thrustArea && <p className="text-xs text-red-500">{errors.thrustArea}</p>}
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label>Goal Title <span className="text-red-500">*</span></Label>
        <Input
          placeholder="e.g. Achieve ₹50L in Q1 sales"
          value={form.title}
          disabled={isSharedGoal}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className={errors.title ? "border-red-400" : ""}
        />
        {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label>Description <span className="text-slate-400 text-xs font-normal">(optional)</span></Label>
        <Textarea
          placeholder="Additional context for this goal..."
          value={form.description}
          disabled={isSharedGoal}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
        />
      </div>

      {/* UoM Type */}
      <div className="space-y-1.5">
        <Label>Unit of Measurement Type <span className="text-red-500">*</span></Label>
        <Select
          value={form.uomType}
          disabled={isSharedGoal}
          onValueChange={(v) =>
            setForm({
              ...form,
              uomType: v ?? "",
              target: v === "ZERO" ? "0" : form.target,
            })
          } 
        >
          <SelectTrigger className={errors.uomType ? "border-red-400" : ""}>
            <SelectValue placeholder="How is success measured?" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(UOM_LABELS).map(([key, val]) => (
              <SelectItem key={key} value={key}>{val.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {uomInfo && (
          <p className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-md">{uomInfo.hint}</p>
        )}
        {errors.uomType && <p className="text-xs text-red-500">{errors.uomType}</p>}
      </div>

      {/* Target */}
      <div className="space-y-1.5">
        <Label>{uomInfo?.targetLabel || "Target Value"} <span className="text-red-500">*</span></Label>
        <Input
          type="number"
          placeholder={form.uomType === "ZERO" ? "0" : "Enter target"}
          value={form.target}
          disabled={isSharedGoal || form.uomType === "ZERO"}
          onChange={(e) => setForm({ ...form, target: e.target.value })}
          className={errors.target ? "border-red-400" : ""}
        />
        {form.uomType === "ZERO" && (
          <p className="text-xs text-slate-400">Target is fixed at 0 for ZERO type goals</p>
        )}
        {errors.target && <p className="text-xs text-red-500">{errors.target}</p>}
      </div>

      {/* Weightage */}
      <div className="space-y-1.5">
        <Label>
          Weightage (%)
          <span className="text-red-500">*</span>
          <span className="text-xs text-slate-400 font-normal ml-2">
            (max allowed: {remainingWeightage.toFixed(1)}%)
          </span>
        </Label>

        
        {/* Only editable field for shared goals */}
        <Input
          type="number"
          min={10}
          max={remainingWeightage}
          step={5}
          placeholder="Min 10%"
          value={form.weightage}
          onChange={(e) => setForm({ ...form, weightage: e.target.value })}
          className={errors.weightage ? "border-red-400" : ""}
        />
        {errors.weightage && <p className="text-xs text-red-500">{errors.weightage}</p>}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Saving..." : initialData?.id ? "Update Goal" : "Add Goal"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
