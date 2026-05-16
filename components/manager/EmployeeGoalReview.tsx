// "use client"

// import { useState } from "react"
// import axios from "axios"
// import { Card, CardContent, CardHeader } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Textarea } from "@/components/ui/textarea"
// import { Avatar, AvatarFallback } from "@/components/ui/avatar"
// import { useToast } from "@/hooks/use-toast"
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogFooter,
// } from "@/components/ui/dialog"
// import {
//   CheckCircle,
//   XCircle,
//   Pencil,
//   Lock,
//   ChevronDown,
//   ChevronUp,
//   AlertCircle,
//   Share2,
// } from "lucide-react"
// import { UOM_LABELS } from "@/lib/calculations"

// const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
//   DRAFT:     { label: "Draft",           className: "bg-slate-100 text-slate-600" },
//   SUBMITTED: { label: "Pending Approval",className: "bg-amber-100 text-amber-700" },
//   LOCKED:    { label: "Approved",        className: "bg-green-100 text-green-700" },
//   RETURNED:  { label: "Returned",        className: "bg-red-100 text-red-700" },
// }

// interface Props {
//   employee: any
//   onUpdate: () => void
// }

// export function EmployeeGoalReview({ employee, onUpdate }: Props) {
//   const { toast } = useToast()
//   const [expanded, setExpanded] = useState(true)
//   const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
//   const [returnGoalId, setReturnGoalId] = useState<string | null>(null)
//   const [returnReason, setReturnReason] = useState("")
//   const [editForm, setEditForm] = useState<any>({})
//   const [actionLoading, setActionLoading] = useState<string | null>(null)

//   const submittedGoals = employee.goals.filter((g: any) => g.status === "SUBMITTED")
//   const allGoals = employee.goals
//   const totalWeightage = submittedGoals.reduce((s: number, g: any) => s + g.weightage, 0)

//   function startEdit(goal: any) {
//     setEditingGoalId(goal.id)
//     setEditForm({
//       target: String(goal.target),
//       weightage: String(goal.weightage),
//       description: goal.description || "",
//     })
//   }

//   async function handleEdit(goalId: string) {
//     setActionLoading(`edit-${goalId}`)
//     try {
//       await axios.patch(`/api/manager/goals/${goalId}/edit`, {
//         ...editForm,
//         target: parseFloat(editForm.target),
//         weightage: parseFloat(editForm.weightage),
//       })
//       setEditingGoalId(null)
//       onUpdate()
//       toast({ title: "Goal updated", description: "Changes saved and audit logged." })
//     } catch (err: any) {
//       toast({
//         title: "Error",
//         description: err.response?.data?.error || "Update failed",
//         variant: "destructive",
//       })
//     } finally {
//       setActionLoading(null)
//     }
//   }

//   async function handleApprove(goalId: string) {
//     setActionLoading(`approve-${goalId}`)
//     try {
//       await axios.post(`/api/manager/goals/${goalId}/approve`)
//       onUpdate()
//       toast({ title: "Goal approved", description: "Goal is now locked." })
//     } catch (err: any) {
//       toast({
//         title: "Error",
//         description: err.response?.data?.error || "Approval failed",
//         variant: "destructive",
//       })
//     } finally {
//       setActionLoading(null)
//     }
//   }

//   async function handleReturn() {
//     if (!returnGoalId) return
//     setActionLoading(`return-${returnGoalId}`)
//     try {
//       await axios.post(`/api/manager/goals/${returnGoalId}/return`, {
//         reason: returnReason,
//       })
//       setReturnGoalId(null)
//       setReturnReason("")
//       onUpdate()
//       toast({ title: "Goal returned", description: "Employee can now revise and resubmit." })
//     } catch (err: any) {
//       toast({
//         title: "Error",
//         description: err.response?.data?.error || "Return failed",
//         variant: "destructive",
//       })
//     } finally {
//       setActionLoading(null)
//     }
//   }

//   async function handleApproveAll() {
//     setActionLoading("approve-all")
//     try {
//       await axios.post("/api/manager/goals/approve-all", { employeeId: employee.id })
//       onUpdate()
//       toast({
//         title: "All goals approved",
//         description: `${submittedGoals.length} goals locked for ${employee.name}.`,
//       })
//     } catch (err: any) {
//       toast({
//         title: "Error",
//         description: err.response?.data?.errors?.join(". ") || "Bulk approval failed",
//         variant: "destructive",
//       })
//     } finally {
//       setActionLoading(null)
//     }
//   }

//   return (
//     <Card className="overflow-hidden">
//       {/* Employee Header */}
//       <CardHeader className="pb-3 border-b border-slate-100">
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <Avatar className="h-9 w-9">
//               <AvatarFallback className="text-xs bg-slate-100 text-slate-700">
//                 {employee.name.slice(0, 2).toUpperCase()}
//               </AvatarFallback>
//             </Avatar>
//             <div>
//               <p className="font-medium text-slate-900 text-sm">{employee.name}</p>
//               <p className="text-xs text-slate-400">
//                 {employee.email} · {employee.department || "N/A"}
//               </p>
//             </div>
//           </div>

//           <div className="flex items-center gap-2">
//             {/* Summary badges */}
//             <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
//               {allGoals.length} goals
//             </span>
//             {submittedGoals.length > 0 && (
//               <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
//                 {submittedGoals.length} pending
//               </span>
//             )}

//             {/* Approve All button */}
//             {submittedGoals.length > 1 && (
//               <Button
//                 size="sm"
//                 className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
//                 onClick={handleApproveAll}
//                 disabled={actionLoading === "approve-all"}
//               >
//                 <CheckCircle size={12} className="mr-1" />
//                 Approve All
//               </Button>
//             )}

//             <Button
//               variant="ghost"
//               size="icon"
//               className="h-7 w-7"
//               onClick={() => setExpanded(!expanded)}
//             >
//               {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
//             </Button>
//           </div>
//         </div>

//         {/* Weightage bar for submitted goals */}
//         {submittedGoals.length > 0 && expanded && (
//           <div className="mt-3">
//             <div className="flex justify-between text-xs text-slate-500 mb-1">
//               <span>Total weightage of pending goals</span>
//               <span className={Math.abs(totalWeightage - 100) < 0.01 ? "text-green-600 font-medium" : "text-amber-600"}>
//                 {totalWeightage}%
//               </span>
//             </div>
//             <div className="w-full bg-slate-100 rounded-full h-1.5">
//               <div
//                 className={`h-1.5 rounded-full ${
//                   Math.abs(totalWeightage - 100) < 0.01 ? "bg-green-500" : "bg-amber-400"
//                 }`}
//                 style={{ width: `${Math.min(totalWeightage, 100)}%` }}
//               />
//             </div>
//             {Math.abs(totalWeightage - 100) > 0.01 && (
//               <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
//                 <AlertCircle size={11} />
//                 Weightage must total 100% before approving all
//               </p>
//             )}
//           </div>
//         )}
//       </CardHeader>

//       {/* Goals List */}
//       {expanded && (
//         <CardContent className="pt-4 space-y-3">
//           {allGoals.length === 0 && (
//             <p className="text-sm text-slate-400 text-center py-4">
//               No goals submitted yet
//             </p>
//           )}

//           {allGoals.map((goal: any) => {
//             const isEditing = editingGoalId === goal.id
//             const statusCfg = STATUS_CONFIG[goal.status] || STATUS_CONFIG.DRAFT
//             const uomInfo = UOM_LABELS[goal.uomType]
//             const isSubmitted = goal.status === "SUBMITTED"

//             return (
//               <div
//                 key={goal.id}
//                 className={`rounded-lg border p-4 transition-all ${
//                   isSubmitted
//                     ? "border-amber-200 bg-amber-50/40"
//                     : "border-slate-200 bg-white"
//                 }`}
//               >
//                 {/* Goal Header */}
//                 <div className="flex items-start justify-between gap-3">
//                   <div className="flex-1 min-w-0">
//                     <div className="flex items-center gap-2 flex-wrap mb-1">
//                       <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.className}`}>
//                         {statusCfg.label}
//                       </span>
//                       <span className="text-xs text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
//                         {goal.thrustArea}
//                       </span>
//                       {goal.isShared && (
//                         <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
//                           <Share2 size={10} /> Shared Goal
//                         </span>
//                       )}
//                     </div>
//                     <p className="text-sm font-medium text-slate-900">{goal.title}</p>

//                     {/* Inline Edit Form */}
//                     {isEditing ? (
//                       <div className="mt-3 space-y-3 bg-white border border-slate-200 rounded-lg p-3">
//                         <div className="grid grid-cols-2 gap-3">
//                           <div>
//                             <label className="text-xs text-slate-500 mb-1 block">
//                               Target Value
//                             </label>
//                             <Input
//                               type="number"
//                               value={editForm.target}
//                               onChange={(e) => setEditForm({ ...editForm, target: e.target.value })}
//                               className="h-8 text-sm"
//                               disabled={goal.isShared}
//                             />
//                             {goal.isShared && (
//                               <p className="text-xs text-slate-400 mt-1">
//                                 Target is read-only for shared goals
//                               </p>
//                             )}
//                           </div>
//                           <div>
//                             <label className="text-xs text-slate-500 mb-1 block">
//                               Weightage (%)
//                             </label>
//                             <Input
//                               type="number"
//                               min={10}
//                               max={100}
//                               value={editForm.weightage}
//                               onChange={(e) => setEditForm({ ...editForm, weightage: e.target.value })}
//                               className="h-8 text-sm"
//                             />
//                           </div>
//                         </div>
//                         <div>
//                           <label className="text-xs text-slate-500 mb-1 block">Description</label>
//                           <Textarea
//                             value={editForm.description}
//                             onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
//                             rows={2}
//                             className="text-sm"
//                           />
//                         </div>
//                         <div className="flex gap-2">
//                           <Button
//                             size="sm"
//                             className="h-7 text-xs"
//                             onClick={() => handleEdit(goal.id)}
//                             disabled={actionLoading === `edit-${goal.id}`}
//                           >
//                             {actionLoading === `edit-${goal.id}` ? "Saving..." : "Save Changes"}
//                           </Button>
//                           <Button
//                             size="sm"
//                             variant="ghost"
//                             className="h-7 text-xs"
//                             onClick={() => setEditingGoalId(null)}
//                           >
//                             Cancel
//                           </Button>
//                         </div>
//                       </div>
//                     ) : (
//                       <div className="flex items-center gap-4 mt-1.5">
//                         <span className="text-xs text-slate-500">
//                           Target:{" "}
//                           <span className="font-medium text-slate-700">
//                             {goal.target.toLocaleString()}
//                           </span>
//                         </span>
//                         <span className="text-xs font-semibold text-slate-800">
//                           {goal.weightage}% weight
//                         </span>
//                         <span className="text-xs text-slate-400">
//                           {uomInfo?.label?.split(" (")[0]}
//                         </span>
//                       </div>
//                     )}

//                     {goal.description && !isEditing && (
//                       <p className="text-xs text-slate-400 mt-1 truncate">{goal.description}</p>
//                     )}
//                   </div>

//                   {/* Action Buttons — only for SUBMITTED goals */}
//                   {isSubmitted && !isEditing && (
//                     <div className="flex items-center gap-1.5 shrink-0">
//                       <Button
//                         size="icon"
//                         variant="ghost"
//                         className="h-7 w-7 text-slate-400 hover:text-slate-700"
//                         title="Edit inline"
//                         onClick={() => startEdit(goal)}
//                       >
//                         <Pencil size={13} />
//                       </Button>
//                       <Button
//                         size="icon"
//                         variant="ghost"
//                         className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
//                         title="Return for rework"
//                         onClick={() => { setReturnGoalId(goal.id); setReturnReason("") }}
//                       >
//                         <XCircle size={14} />
//                       </Button>
//                       <Button
//                         size="icon"
//                         variant="ghost"
//                         className="h-7 w-7 text-green-500 hover:text-green-700 hover:bg-green-50"
//                         title="Approve goal"
//                         onClick={() => handleApprove(goal.id)}
//                         disabled={actionLoading === `approve-${goal.id}`}
//                       >
//                         <CheckCircle size={14} />
//                       </Button>
//                     </div>
//                   )}

//                   {/* Lock icon for approved goals */}
//                   {goal.status === "LOCKED" && (
//                     <Lock size={14} className="text-slate-300 shrink-0 mt-1" />
//                   )}
//                 </div>
//               </div>
//             )
//           })}
//         </CardContent>
//       )}

//       {/* Return Reason Dialog */}
//       <Dialog open={!!returnGoalId} onOpenChange={() => setReturnGoalId(null)}>
//         <DialogContent className="max-w-md">
//           <DialogHeader>
//             <DialogTitle>Return Goal for Rework</DialogTitle>
//           </DialogHeader>
//           <div className="space-y-3 py-2">
//             <p className="text-sm text-slate-500">
//               The employee will be able to edit and resubmit this goal. Provide a reason so they know what to fix.
//             </p>
//             <Textarea
//               placeholder="e.g. Target seems too low — please revise to ₹60L and resubmit"
//               value={returnReason}
//               onChange={(e) => setReturnReason(e.target.value)}
//               rows={3}
//             />
//           </div>
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setReturnGoalId(null)}>
//               Cancel
//             </Button>
//             <Button
//               className="bg-red-600 hover:bg-red-700 text-white"
//               onClick={handleReturn}
//               disabled={actionLoading?.startsWith("return")}
//             >
//               {actionLoading?.startsWith("return") ? "Returning..." : "Return Goal"}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </Card>
//   )
// }


// sonner version : 
"use client"

import { useState } from "react"
import axios from "axios"
import { toast } from "sonner"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

import {
  CheckCircle,
  XCircle,
  Pencil,
  Lock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Share2,
  Square,
  CheckSquare,
} from "lucide-react"

import { UOM_LABELS } from "@/lib/calculations"

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-600" },
  SUBMITTED: {
    label: "Pending Approval",
    className: "bg-amber-100 text-amber-700",
  },
  LOCKED: { label: "Approved", className: "bg-green-100 text-green-700" },
  RETURNED: { label: "Returned", className: "bg-red-100 text-red-700" },
  APPROVED: { label: "Approved", className: "bg-green-100 text-green-700" },
}

interface EmployeeGoalReviewProps {
  employee: any
  onUpdate: () => void
}

export function EmployeeGoalReview({
  employee,
  onUpdate,
}: EmployeeGoalReviewProps) {
  const [expanded, setExpanded] = useState(true)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [returnGoalId, setReturnGoalId] = useState<string | null>(null)
  const [returnReason, setReturnReason] = useState("")
  const [editForm, setEditForm] = useState({
    target: "",
    weightage: "",
    description: "",
  })
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const goals = Array.isArray(employee?.goals) ? employee.goals : []
  const submittedGoals = goals.filter((goal: any) => goal.status === "SUBMITTED")

  const totalWeightage = submittedGoals.reduce(
    (sum: number, goal: any) => sum + Number(goal.weightage || 0),
    0
  )

  function startEdit(goal: any) {
    setEditingGoalId(goal.id)
    setEditForm({
      target: goal.target !== undefined ? String(goal.target) : "",
      weightage: goal.weightage !== undefined ? String(goal.weightage) : "",
      description: goal.description || "",
    })
  }

  function updateEditForm(
    key: "target" | "weightage" | "description",
    value: string
  ) {
    setEditForm((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  async function handleEdit(goalId: string) {
    if (editForm.target === "" || Number.isNaN(Number(editForm.target))) {
      toast.error("Enter a valid target")
      return
    }

    if (
      editForm.weightage === "" ||
      Number.isNaN(Number(editForm.weightage))
    ) {
      toast.error("Enter a valid weightage")
      return
    }

    if (Number(editForm.weightage) < 10) {
      toast.error("Minimum 10% weightage required")
      return
    }

    if (Number(editForm.weightage) > 100) {
      toast.error("Weightage cannot exceed 100%")
      return
    }

    setActionLoading(`edit-${goalId}`)

    try {
      await axios.patch(`/api/manager/goals/${goalId}/edit`, {
        target: Number(editForm.target),
        weightage: Number(editForm.weightage),
        description: editForm.description,
      })

      setEditingGoalId(null)
      onUpdate()

      toast.success("Goal updated", {
        description: "Changes saved and audit logged.",
      })
    } catch (err: any) {
      toast.error("Error", {
        description: err.response?.data?.error || "Update failed",
      })
    } finally {
      setActionLoading(null)
    }
  }

  async function handleApprove(goalId: string) {
    setActionLoading(`approve-${goalId}`)

    try {
      await axios.post(`/api/manager/goals/${goalId}/approve`)
      onUpdate()

      toast.success("Goal approved", {
        description: "Goal is now locked.",
      })
    } catch (err: any) {
      toast.error("Error", {
        description: err.response?.data?.error || "Approval failed",
      })
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReturn() {
    if (!returnGoalId) return

    if (!returnReason.trim()) {
      toast.error("Return reason is required")
      return
    }

    setActionLoading(`return-${returnGoalId}`)

    try {
      await axios.post(`/api/manager/goals/${returnGoalId}/return`, {
        reason: returnReason.trim(),
      })

      setReturnGoalId(null)
      setReturnReason("")
      onUpdate()

      toast.success("Goal returned", {
        description: "Employee can now revise and resubmit.",
      })
    } catch (err: any) {
      toast.error("Error", {
        description: err.response?.data?.error || "Return failed",
      })
    } finally {
      setActionLoading(null)
    }
  }

  async function handleApproveAll() {
    setActionLoading("approve-all")

    try {
      await axios.post("/api/manager/goals/approve-all", {
        employeeId: employee.id,
      })

      onUpdate()

      toast.success("All goals approved", {
        description: `${submittedGoals.length} goals locked for ${employee.name}.`,
      })
    } catch (err: any) {
      toast.error("Error", {
        description:
          err.response?.data?.errors?.join(". ") || "Bulk approval failed",
      })
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs bg-slate-100 text-slate-700">
                {employee.name?.slice(0, 2).toUpperCase() || "NA"}
              </AvatarFallback>
            </Avatar>

            <div>
              <p className="font-medium text-slate-900 text-sm">
                {employee.name}
              </p>
              <p className="text-xs text-slate-400">
                {employee.email} · {employee.department || "N/A"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
              {goals.length} goals
            </span>

            {submittedGoals.length > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                {submittedGoals.length} pending
              </span>
            )}

            {submittedGoals.length > 1 && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
                onClick={handleApproveAll}
                disabled={actionLoading === "approve-all"}
              >
                <CheckCircle size={12} className="mr-1" />
                {actionLoading === "approve-all" ? "Approving..." : "Approve All"}
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
          </div>
        </div>

        {submittedGoals.length > 0 && expanded && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Total weightage of pending goals</span>
              <span
                className={
                  Math.abs(totalWeightage - 100) < 0.01
                    ? "text-green-600 font-medium"
                    : "text-amber-600"
                }
              >
                {totalWeightage}%
              </span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${
                  Math.abs(totalWeightage - 100) < 0.01
                    ? "bg-green-500"
                    : "bg-amber-400"
                }`}
                style={{ width: `${Math.min(totalWeightage, 100)}%` }}
              />
            </div>

            {Math.abs(totalWeightage - 100) > 0.01 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle size={11} />
                Weightage must total 100% before approving all
              </p>
            )}
          </div>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-4 space-y-3">
          {goals.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">
              No goals submitted yet
            </p>
          )}

          {goals.map((goal: any) => {
            const isEditing = editingGoalId === goal.id
            const statusCfg = STATUS_CONFIG[goal.status] || STATUS_CONFIG.DRAFT
            const uomInfo = UOM_LABELS[goal.uomType]
            const isSubmitted = goal.status === "SUBMITTED"

            return (
              <div
                key={goal.id}
                className={`rounded-lg border p-4 transition-all ${
                  isSubmitted
                    ? "border-amber-200 bg-amber-50/40"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.className}`}
                      >
                        {statusCfg.label}
                      </span>

                      <span className="text-xs text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                        {goal.thrustArea}
                      </span>

                      {goal.isShared && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Share2 size={10} /> Shared Goal
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-medium text-slate-900">
                      {goal.title}
                    </p>

                    {isEditing ? (
                      <div className="mt-3 space-y-3 bg-white border border-slate-200 rounded-lg p-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">
                              Target Value
                            </label>
                            <Input
                              type="number"
                              value={editForm.target}
                              onChange={(e) =>
                                updateEditForm("target", e.target.value)
                              }
                              className="h-8 text-sm"
                              disabled={goal.isShared}
                            />
                            {goal.isShared && (
                              <p className="text-xs text-slate-400 mt-1">
                                Target is read-only for shared goals
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">
                              Weightage (%)
                            </label>
                            <Input
                              type="number"
                              min={10}
                              max={100}
                              value={editForm.weightage}
                              onChange={(e) =>
                                updateEditForm("weightage", e.target.value)
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">
                            Description
                          </label>
                          <Textarea
                            value={editForm.description}
                            onChange={(e) =>
                              updateEditForm("description", e.target.value)
                            }
                            rows={2}
                            className="text-sm"
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleEdit(goal.id)}
                            disabled={actionLoading === `edit-${goal.id}`}
                          >
                            {actionLoading === `edit-${goal.id}`
                              ? "Saving..."
                              : "Save Changes"}
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setEditingGoalId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 mt-1.5">
                        <span className="text-xs text-slate-500">
                          Target:{" "}
                          <span className="font-medium text-slate-700">
                            {Number(goal.target || 0).toLocaleString()}
                          </span>
                        </span>

                        <span className="text-xs font-semibold text-slate-800">
                          {goal.weightage}% weight
                        </span>

                        <span className="text-xs text-slate-400">
                          {uomInfo?.label?.split(" (")[0]}
                        </span>
                      </div>
                    )}

                    {goal.description && !isEditing && (
                      <p className="text-xs text-slate-400 mt-1 truncate">
                        {goal.description}
                      </p>
                    )}
                  </div>

                  {isSubmitted && !isEditing && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-400 hover:text-slate-700"
                        title="Edit inline"
                        onClick={() => startEdit(goal)}
                      >
                        <Pencil size={13} />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                        title="Return for rework"
                        onClick={() => {
                          setReturnGoalId(goal.id)
                          setReturnReason("")
                        }}
                      >
                        <XCircle size={14} />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-green-500 hover:text-green-700 hover:bg-green-50"
                        title="Approve goal"
                        onClick={() => handleApprove(goal.id)}
                        disabled={actionLoading === `approve-${goal.id}`}
                      >
                        <CheckCircle size={14} />
                      </Button>
                    </div>
                  )}

                  {(goal.status === "LOCKED" || goal.status === "APPROVED") && (
                    <Lock size={14} className="text-slate-300 shrink-0 mt-1" />
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      )}

      <Dialog open={!!returnGoalId} onOpenChange={() => setReturnGoalId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Return Goal for Rework</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-500">
              The employee will be able to edit and resubmit this goal. Provide
              a reason so they know what to fix.
            </p>

            <Textarea
              placeholder="e.g. Target seems too low — please revise and resubmit"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnGoalId(null)}>
              Cancel
            </Button>

            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleReturn}
              disabled={actionLoading?.startsWith("return")}
            >
              {actionLoading?.startsWith("return")
                ? "Returning..."
                : "Return Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}