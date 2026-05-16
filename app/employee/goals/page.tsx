"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { GoalForm } from "@/components/employee/GoalForm"
import { GoalCard } from "@/components/employee/GoalCard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { getRemainingWeightage, validateGoalSet } from "@/lib/calculations"
import { Plus, Send, AlertCircle } from "lucide-react"

export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<any>(null)
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const fetchGoals = useCallback(async () => {
    const res = await axios.get("/api/goals")
    setGoals(res.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  // Only editable goals (DRAFT or RETURNED)
  const editableGoals = goals.filter(
    (g) => g.status === "DRAFT" || g.status === "RETURNED"
  )
  const lockedGoals = goals.filter(
    (g) => g.status === "SUBMITTED" || g.status === "APPROVED" || g.status === "LOCKED"
  )

  const totalWeightage = editableGoals.reduce((s, g) => s + g.weightage, 0)
  const remaining = getRemainingWeightage(editableGoals)
  const canAddMore = editableGoals.length < 8

  const validation = editableGoals.length > 0
    ? validateGoalSet(editableGoals.map((g) => ({ weightage: g.weightage })))
    : { valid: false, errors: ["Add at least one goal"] }

  
  async function handleAdd(formData: any) {
    setFormLoading(true)

    try {
      await axios.post("/api/goals", formData)
      await fetchGoals()
      setShowForm(false)

      toast.success("Goal added", {
        description: "Draft saved successfully.",
      })
    } catch (err: any) {
      toast.error("Error", {
        description: err.response?.data?.error || "Failed to add goal",
      })
    } finally {
      setFormLoading(false)
    }
  }

  async function handleEdit(formData: any) {
    if (!editingGoal) return

    setFormLoading(true)

    try {
      await axios.patch(`/api/goals/${editingGoal.id}`, formData)
      await fetchGoals()
      setEditingGoal(null)

      toast.success("Goal updated", {
        description: "Changes saved successfully.",
      })
    } catch (err: any) {
      toast.error("Error", {
        description: err.response?.data?.error || "Failed to update",
      })
    } finally {
      setFormLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteGoalId) return

    try {
      await axios.delete(`/api/goals/${deleteGoalId}`)
      await fetchGoals()
      setDeleteGoalId(null)

      toast.success("Goal deleted")
    } catch (err: any) {
      toast.error("Error", {
        description: err.response?.data?.error || "Failed to delete",
      })
    }
  }

  async function handleSubmitAll() {
    setSubmitting(true)

    try {
      await axios.post("/api/goals/submit")
      await fetchGoals()

      toast.success("Goals submitted!", {
        description: "Your manager will review and approve them.",
      })
    } catch (err: any) {
      const errData = err.response?.data

      toast.error("Submission failed", {
        description:
          errData?.errors?.join(". ") ||
          errData?.error ||
          "Please fix errors",
      })
    } finally {
      setSubmitting(false)
    }
  }

  
  if (loading) return <div className="p-8 text-slate-400">Loading goals...</div>

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Goals</h1>
          <p className="text-slate-500 text-sm mt-1">
            {editableGoals.length} / 8 goals · {totalWeightage.toFixed(1)}% allocated
          </p>
        </div>
        <div className="flex gap-3">

          {canAddMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(true)}
            >
              <Plus size={14} className="mr-1.5" />
              Add Goal
            </Button>
          )}

          {editableGoals.length > 0 && (
            <Button
              size="sm"
              disabled={!validation.valid || submitting}
              onClick={handleSubmitAll}
            >
              <Send size={14} className="mr-1.5" />
              {submitting ? "Submitting..." : "Submit for Approval"}
            </Button>
          )}
        </div>
      </div>

      {/* Validation Banner */}
      {editableGoals.length > 0 && !validation.valid && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Fix before submitting</p>
              <ul className="mt-1 space-y-0.5">
                {validation.errors.map((err) => (
                  <li key={err} className="text-xs text-amber-700">• {err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Weightage Progress Bar */}
      {editableGoals.length > 0 && (
        <div className="mb-6 bg-white border border-slate-200 rounded-lg px-4 py-3">
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>Weightage allocated</span>
            <span className={Math.abs(totalWeightage - 100) < 0.01 ? "text-green-600 font-medium" : ""}>
              {totalWeightage.toFixed(1)}% / 100%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                Math.abs(totalWeightage - 100) < 0.01
                  ? "bg-green-500"
                  : totalWeightage > 100
                  ? "bg-red-500"
                  : "bg-amber-400"
              }`}
              style={{ width: `${Math.min(totalWeightage, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Draft / Returned Goals */}
      {editableGoals.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Draft / Returned
          </h2>
          <div className="space-y-3">
            {editableGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={() => setEditingGoal(goal)}
                onDelete={() => setDeleteGoalId(goal.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Locked / Submitted Goals */}
      {lockedGoals.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Submitted / Approved
          </h2>
          <div className="space-y-3">
            {lockedGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} readOnly />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {goals.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
          <p className="text-slate-400 font-medium">No goals yet for this cycle</p>
          <p className="text-sm text-slate-400 mt-1">Add between 1–8 goals totalling 100% weightage</p>
          <Button size="sm" className="mt-4" onClick={() => setShowForm(true)}>
            <Plus size={14} className="mr-1.5" />
            Add First Goal
          </Button>
        </div>
      )}

      {/* Add Goal Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Goal</DialogTitle>
          </DialogHeader>
          <GoalForm
            remainingWeightage={remaining}
            onSubmit={handleAdd}
            onCancel={() => setShowForm(false)}
            isLoading={formLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Goal Dialog */}
      <Dialog open={!!editingGoal} onOpenChange={() => setEditingGoal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
          </DialogHeader>
          {editingGoal && (
            <GoalForm
              initialData={editingGoal}
              remainingWeightage={getRemainingWeightage(
                editableGoals,
                editableGoals.findIndex((g) => g.id === editingGoal.id)
              )}
              onSubmit={handleEdit}
              onCancel={() => setEditingGoal(null)}
              isLoading={formLoading}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={!!deleteGoalId} onOpenChange={() => setDeleteGoalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this goal?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The goal will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}