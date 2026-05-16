"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { toast } from "sonner"
import { Share2, CheckSquare, Square } from "lucide-react"
import { UOM_LABELS } from "@/lib/calculations"

const THRUST_AREAS = [
  "Revenue Growth", "Customer Success", "Operational Efficiency",
  "Safety", "Learning & Development", "Innovation",
  "People & Culture", "Compliance & Risk",
]

type SharedGoalForm = {
  thrustArea: string
  title: string
  description: string
  uomType: string
  target: string
  weightage: string
}


export default function SharedGoalsPage() {
  const [reports, setReports] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

const [form, setForm] = useState<SharedGoalForm>({
  thrustArea: "",
  title: "",
  description: "",
  uomType: "",
  target: "",
  weightage: "10",
})

  useEffect(() => {
    axios.get("/api/manager/team-goals").then((res) => setReports(res.data))
  }, [])

  function toggleEmployee(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  function toggleAll() {
    setSelectedIds(
      selectedIds.length === reports.length ? [] : reports.map((r) => r.id)
    )
  }

  async function handlePush() {
    if (selectedIds.length === 0) {
        toast.error("Select at least one employee")
        return
    }

    if (!form.thrustArea || !form.title || !form.uomType || form.target === "") {
        toast.error("Fill all required fields")
        return
    }

    setLoading(true)

    try {
        const res = await axios.post("/api/manager/shared-goals", {
        employeeIds: selectedIds,
        goal: form,
        })

        toast.success("Shared goal pushed", {
        description: `Goal pushed to ${res.data.created} employee(s). They can set their own weightage.`,
        })

        setForm({
        thrustArea: "",
        title: "",
        description: "",
        uomType: "",
        target: "",
        weightage: "10",
        })

        setSelectedIds([])
    } catch (err: any) {
        toast.error("Error", {
        description: err.response?.data?.error || "Failed to push",
        })
    } finally {
        setLoading(false)
    }
}

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Push Shared Goal</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Push a common KPI to one or more team members. Target is locked; employees set their own weightage.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Goal Definition */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Define the Shared Goal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Thrust Area <span className="text-red-500">*</span></Label>
              <Select
                value={form.thrustArea}
                onValueChange={(value, eventDetails) => {
                  if (value !== null) {
                    setForm((prev) => ({
                      ...prev,
                      thrustArea: value,
                    }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  {THRUST_AREAS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Goal Title <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g. Achieve Team Safety Score"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Goal details..."
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>UoM Type <span className="text-red-500">*</span></Label>
              <Select
                value={form.uomType}
                onValueChange={(value, eventDetails) => {
                  if (value !== null) {
                    setForm((prev) => ({
                      ...prev,
                      uomType: value,
                      target: value === "ZERO" ? "0" : prev.target,
                    }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="How is it measured?" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(UOM_LABELS).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Target <span className="text-red-500">*</span></Label>
                <Input
                    type="number"
                    placeholder={form.uomType === "ZERO" ? "0" : "Target value"}
                    value={form.target}
                    readOnly={form.uomType === "ZERO"}
                    onChange={(e) => setForm({ ...form, target: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Default Weightage (%)</Label>
                <Input
                  type="number"
                  min={10}
                  max={100}
                  value={form.weightage}
                  onChange={(e) => setForm({ ...form, weightage: e.target.value })}
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <p className="text-xs text-blue-700">
                <strong>Note:</strong> Target is locked for employees. They can only adjust the weightage.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Employee Selection */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Select Employees</CardTitle>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={toggleAll}>
                {selectedIds.length === reports.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {reports.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No direct reports found</p>
            )}
            {reports.map((emp) => {
              const selected = selectedIds.includes(emp.id)
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => toggleEmployee(emp.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                    selected
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {selected
                    ? <CheckSquare size={16} className="text-slate-900 shrink-0" />
                    : <Square size={16} className="text-slate-300 shrink-0" />
                  }
                  <div>
                    <p className="text-sm font-medium text-slate-900">{emp.name}</p>
                    <p className="text-xs text-slate-400">{emp.email}</p>
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Push Button */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {selectedIds.length > 0
            ? `Pushing to ${selectedIds.length} employee(s)`
            : "No employees selected"}
        </p>
        <Button onClick={handlePush} disabled={loading} className="gap-2">
          <Share2 size={14} />
          {loading ? "Pushing..." : "Push Shared Goal"}
        </Button>
      </div>
    </div>
  )
}



// "use client"

// import { useState, useEffect } from "react"
// import axios from "axios"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Textarea } from "@/components/ui/textarea"
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select"
// import { toast } from "sonner"
// import { Share2, CheckSquare, Square } from "lucide-react"
// import { UOM_LABELS } from "@/lib/calculations"

// const THRUST_AREAS = [
//   "Revenue Growth", "Customer Success", "Operational Efficiency",
//   "Safety", "Learning & Development", "Innovation",
//   "People & Culture", "Compliance & Risk",
// ]

// type SharedGoalForm = {
//   thrustArea: string
//   title: string
//   description: string
//   uomType: string
//   target: string
//   weightage: string
// }


// export default function SharedGoalsPage() {
//   const [reports, setReports] = useState<any[]>([])
//   const [selectedIds, setSelectedIds] = useState<string[]>([])
//   const [loading, setLoading] = useState(false)

// const [form, setForm] = useState<SharedGoalForm>({
//   thrustArea: "",
//   title: "",
//   description: "",
//   uomType: "",
//   target: "",
//   weightage: "10",
// })

//   useEffect(() => {
//     axios.get("/api/manager/team-goals").then((res) => setReports(res.data))
//   }, [])

//   function toggleEmployee(id: string) {
//     setSelectedIds((prev) =>
//       prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
//     )
//   }

//   function toggleAll() {
//     setSelectedIds(
//       selectedIds.length === reports.length ? [] : reports.map((r) => r.id)
//     )
//   }

//   async function handlePush() {
//     if (selectedIds.length === 0) {
//         toast.error("Select at least one employee")
//         return
//     }

//     if (!form.thrustArea || !form.title || !form.uomType || form.target === "") {
//         toast.error("Fill all required fields")
//         return
//     }

//     setLoading(true)

//     try {
//         const res = await axios.post("/api/manager/shared-goals", {
//         employeeIds: selectedIds,
//         goal: form,
//         })

//         toast.success("Shared goal pushed", {
//         description: `Goal pushed to ${res.data.created} employee(s). They can set their own weightage.`,
//         })

//         setForm({
//         thrustArea: "",
//         title: "",
//         description: "",
//         uomType: "",
//         target: "",
//         weightage: "10",
//         })

//         setSelectedIds([])
//     } catch (err: any) {
//         toast.error("Error", {
//         description: err.response?.data?.error || "Failed to push",
//         })
//     } finally {
//         setLoading(false)
//     }
// }

//   return (
//     <div className="p-8 max-w-4xl">
//       <div className="mb-6">
//         <h1 className="text-2xl font-semibold text-slate-900">Push Shared Goal</h1>
//         <p className="text-slate-500 mt-1 text-sm">
//           Push a common KPI to one or more team members. Target is locked; employees set their own weightage.
//         </p>
//       </div>

//       <div className="grid grid-cols-2 gap-6">
//         {/* Goal Definition */}
//         <Card>
//           <CardHeader className="pb-3">
//             <CardTitle className="text-sm">Define the Shared Goal</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             <div className="space-y-1.5">
//               <Label>Thrust Area <span className="text-red-500">*</span></Label>
//               <Select
//                 value={form.thrustArea}
//                 onValueChange={(value, eventDetails) => {
//                   if (value !== null) {
//                     setForm((prev) => ({
//                       ...prev,
//                       thrustArea: value,
//                     }));
//                   }
//                 }}
//               >
//                 <SelectTrigger>
//                   <SelectValue placeholder="Select area" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {THRUST_AREAS.map((a) => (
//                     <SelectItem key={a} value={a}>
//                       {a}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             <div className="space-y-1.5">
//               <Label>Goal Title <span className="text-red-500">*</span></Label>
//               <Input
//                 placeholder="e.g. Achieve Team Safety Score"
//                 value={form.title}
//                 onChange={(e) => setForm({ ...form, title: e.target.value })}
//               />
//             </div>

//             <div className="space-y-1.5">
//               <Label>Description</Label>
//               <Textarea
//                 placeholder="Goal details..."
//                 rows={2}
//                 value={form.description}
//                 onChange={(e) => setForm({ ...form, description: e.target.value })}
//               />
//             </div>

//             <div className="space-y-1.5">
//               <Label>UoM Type <span className="text-red-500">*</span></Label>
//               <Select
//                 value={form.uomType}
//                 onValueChange={(value, eventDetails) => {
//                   if (value !== null) {
//                     setForm((prev) => ({
//                       ...prev,
//                       uomType: value,
//                       target: value === "ZERO" ? "0" : prev.target,
//                     }));
//                   }
//                 }}
//               >
//                 <SelectTrigger>
//                   <SelectValue placeholder="How is it measured?" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {Object.entries(UOM_LABELS).map(([key, value]) => (
//                     <SelectItem key={key} value={key}>
//                       {value.label}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             <div className="grid grid-cols-2 gap-3">
//               <div className="space-y-1.5">
//                 <Label>Target <span className="text-red-500">*</span></Label>
//                 <Input
//                     type="number"
//                     placeholder={form.uomType === "ZERO" ? "0" : "Target value"}
//                     value={form.target}
//                     readOnly={form.uomType === "ZERO"}
//                     onChange={(e) => setForm({ ...form, target: e.target.value })}
//                 />
//               </div>
//               <div className="space-y-1.5">
//                 <Label>Default Weightage (%)</Label>
//                 <Input
//                   type="number"
//                   min={10}
//                   max={100}
//                   value={form.weightage}
//                   onChange={(e) => setForm({ ...form, weightage: e.target.value })}
//                 />
//               </div>
//             </div>

//             <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
//               <p className="text-xs text-blue-700">
//                 <strong>Note:</strong> Target is locked for employees. They can only adjust the weightage.
//               </p>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Employee Selection */}
//         <Card>
//           <CardHeader className="pb-3">
//             <div className="flex items-center justify-between">
//               <CardTitle className="text-sm">Select Employees</CardTitle>
//               <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={toggleAll}>
//                 {selectedIds.length === reports.length ? "Deselect All" : "Select All"}
//               </Button>
//             </div>
//           </CardHeader>
//           <CardContent className="space-y-2">
//             {reports.length === 0 && (
//               <p className="text-sm text-slate-400 text-center py-4">No direct reports found</p>
//             )}
//             {reports.map((emp) => {
//               const selected = selectedIds.includes(emp.id)
//               return (
//                 <button
//                   key={emp.id}
//                   type="button"
//                   onClick={() => toggleEmployee(emp.id)}
//                   className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
//                     selected
//                       ? "border-slate-900 bg-slate-50"
//                       : "border-slate-200 hover:border-slate-300"
//                   }`}
//                 >
//                   {selected
//                     ? <CheckSquare size={16} className="text-slate-900 shrink-0" />
//                     : <Square size={16} className="text-slate-300 shrink-0" />
//                   }
//                   <div>
//                     <p className="text-sm font-medium text-slate-900">{emp.name}</p>
//                     <p className="text-xs text-slate-400">{emp.email}</p>
//                   </div>
//                 </button>
//               )
//             })}
//           </CardContent>
//         </Card>
//       </div>

//       {/* Push Button */}
//       <div className="mt-6 flex items-center justify-between">
//         <p className="text-sm text-slate-500">
//           {selectedIds.length > 0
//             ? `Pushing to ${selectedIds.length} employee(s)`
//             : "No employees selected"}
//         </p>
//         <Button onClick={handlePush} disabled={loading} className="gap-2">
//           <Share2 size={14} />
//           {loading ? "Pushing..." : "Push Shared Goal"}
//         </Button>
//       </div>
//     </div>
//   )
// }