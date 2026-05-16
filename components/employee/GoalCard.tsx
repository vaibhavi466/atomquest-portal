import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Lock } from "lucide-react"
import { UOM_LABELS } from "@/lib/calculations"

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-600" },
  SUBMITTED: { label: "Pending Approval", className: "bg-amber-100 text-amber-700" },
  APPROVED: { label: "Approved", className: "bg-green-100 text-green-700" },
  LOCKED: { label: "Locked", className: "bg-blue-100 text-blue-700" },
  RETURNED: { label: "Returned", className: "bg-red-100 text-red-700" },
}

interface GoalCardProps {
  goal: any
  onEdit?: () => void
  onDelete?: () => void
  readOnly?: boolean
}

export function GoalCard({ goal, onEdit, onDelete, readOnly }: GoalCardProps) {
  const statusCfg = STATUS_CONFIG[goal.status] || STATUS_CONFIG.DRAFT
  const uomInfo = UOM_LABELS[goal.uomType]

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.className}`}
            >
              {statusCfg.label}
            </span>
            <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
              {goal.thrustArea}
            </span>
            <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
              {uomInfo?.label?.split(" (")[0] || goal.uomType}
            </span>
          </div>

          <h3 className="text-sm font-medium text-slate-900 mt-1">{goal.title}</h3>
          {goal.description && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{goal.description}</p>
          )}

          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs text-slate-500">
              Target: <span className="font-medium text-slate-700">{goal.target.toLocaleString()}</span>
            </span>
            <span className="text-xs font-semibold text-slate-800">
              {goal.weightage}% weight
            </span>
          </div>
        </div>

        {/* Actions */}
        {!readOnly && (
          <div className="flex gap-1.5 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-slate-400 hover:text-slate-700"
              onClick={onEdit}
            >
              <Pencil size={13} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-slate-400 hover:text-red-600"
              onClick={onDelete}
            >
              <Trash2 size={13} />
            </Button>
          </div>
        )}

        {readOnly && (
          <Lock size={14} className="text-slate-300 shrink-0 mt-1" />
        )}
      </div>
    </div>
  )
}