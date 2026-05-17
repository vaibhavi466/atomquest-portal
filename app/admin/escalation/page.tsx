"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  AlertTriangle, Play, CheckCircle,
  Clock, Bell, RefreshCw,
} from "lucide-react"

const TRIGGER_CONFIG: Record<string, { label: string; description: string; color: string }> = {
  GOAL_NOT_SUBMITTED: {
    label: "Goal Not Submitted",
    description: "Employee hasn't submitted goals N days after cycle opening",
    color: "bg-amber-100 text-amber-700",
  },
  GOAL_NOT_APPROVED: {
    label: "Goal Not Approved",
    description: "Manager hasn't approved submitted goals within N days",
    color: "bg-orange-100 text-orange-700",
  },
  CHECKIN_NOT_COMPLETED: {
    label: "Check-in Not Completed",
    description: "Employee hasn't logged check-in within the active quarter window",
    color: "bg-red-100 text-red-700",
  },
}

export default function EscalationPage() {
  const [rules, setRules] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [editingRule, setEditingRule] = useState<Record<string, any>>({})
  const [lastRunResult, setLastRunResult] = useState<any>(null)

  const fetchData = useCallback(async () => {
    const [rulesRes, logsRes] = await Promise.all([
      axios.get("/api/admin/escalation/rules"),
      axios.get("/api/admin/escalation/logs"),
    ])
    setRules(rulesRes.data)
    setLogs(logsRes.data)
    const initial: Record<string, any> = {}
    rulesRes.data.forEach((r: any) => { initial[r.id] = { ...r } })
    setEditingRule(initial)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSaveRule(ruleId: string) {
    try {
      await axios.patch("/api/admin/escalation/rules", editingRule[ruleId])
      await fetchData()
      toast.success("Rule updated")
    } catch {
      toast.error("Failed to update rule")
    }
  }

  async function handleRunNow() {
    setRunning(true)
    try {
      const res = await axios.post("/api/admin/escalation/run")
      setLastRunResult(res.data)
      await fetchData()
      toast.success("Escalation check complete", {
        description: `${res.data.escalated} new escalation(s) created`,
      })
    } catch {
      toast.error("Escalation check failed")
    } finally {
      setRunning(false)
    }
  }

  async function handleResolve(logId: string) {
    try {
      await axios.post(`/api/admin/escalation/logs/${logId}/resolve`)
      await fetchData()
      toast.success("Escalation resolved")
    } catch {
      toast.error("Failed to resolve")
    }
  }

  const unresolvedLogs = logs.filter((l) => !l.isResolved)
  const resolvedLogs   = logs.filter((l) => l.isResolved)

  if (loading) return <div className="p-8 text-slate-400">Loading escalation module...</div>

  return (
    <div className="p-8 max-w-5xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Escalation Module
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Configure rule-based escalations · Runs daily at 9:00 AM via cron
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRunResult && (
            <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
              Last run: {lastRunResult.escalated} escalated / {lastRunResult.checked} checked
            </span>
          )}
          <Button
            onClick={handleRunNow}
            disabled={running}
            size="sm"
            className="gap-2"
          >
            {running
              ? <><RefreshCw size={14} className="animate-spin" /> Running...</>
              : <><Play size={14} /> Run Now</>
            }
          </Button>
        </div>
      </div>

      {/* Active alert banner */}
      {unresolvedLogs.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-600 shrink-0" />
          <p className="text-sm text-red-800 font-medium">
            {unresolvedLogs.length} unresolved escalation
            {unresolvedLogs.length !== 1 ? "s" : ""} require attention
          </p>
        </div>
      )}

      {/* Rules Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-700">
            Escalation Rules
          </CardTitle>
          <p className="text-xs text-slate-400">
            Configure thresholds and toggle rules on/off
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {rules.map((rule) => {
            const cfg = TRIGGER_CONFIG[rule.triggerType]
            const draft = editingRule[rule.id] || rule
            const isDirty =
              draft.daysThreshold !== rule.daysThreshold ||
              draft.isActive !== rule.isActive

            return (
              <div
                key={rule.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-slate-400">
                        {rule._count?.logs || 0} escalation
                        {(rule._count?.logs || 0) !== 1 ? "s" : ""} triggered
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{cfg.description}</p>
                  </div>

                  {/* Active toggle */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Label className="text-xs text-slate-500">Active</Label>
                    <Switch
                      checked={draft.isActive}
                      onCheckedChange={(val) =>
                        setEditingRule((prev) => ({
                          ...prev,
                          [rule.id]: { ...prev[rule.id], isActive: val },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-500 whitespace-nowrap">
                      Escalate after
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={90}
                      className="w-16 h-7 text-sm text-center"
                      value={draft.daysThreshold}
                      onChange={(e) =>
                        setEditingRule((prev) => ({
                          ...prev,
                          [rule.id]: {
                            ...prev[rule.id],
                            daysThreshold: parseInt(e.target.value) || 1,
                          },
                        }))
                      }
                    />
                    <Label className="text-xs text-slate-500">days</Label>
                  </div>

                  {isDirty && (
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleSaveRule(rule.id)}
                    >
                      Save Changes
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Unresolved Escalations */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-700">
              Escalation Log
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                {unresolvedLogs.length} open
              </span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                {resolvedLogs.length} resolved
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
              <Bell size={28} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No escalations yet</p>
              <p className="text-slate-400 text-sm mt-1">
                Click "Run Now" to check for escalation conditions
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`rounded-xl border p-4 flex items-start justify-between gap-4 ${
                    log.isResolved
                      ? "border-slate-100 bg-slate-50 opacity-60"
                      : "border-orange-200 bg-orange-50/40"
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        log.isResolved
                          ? "bg-green-100"
                          : "bg-orange-100"
                      }`}
                    >
                      {log.isResolved
                        ? <CheckCircle size={13} className="text-green-600" />
                        : <AlertTriangle size={13} className="text-orange-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          TRIGGER_CONFIG[log.triggerType]?.color
                        }`}>
                          {TRIGGER_CONFIG[log.triggerType]?.label}
                        </span>
                        <span className="text-xs text-slate-400">
                          Level {log.level} · Notified: {log.notifiedUser?.name}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{log.message}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(log.createdAt).toLocaleString("en-IN")}
                        {log.isResolved && log.resolvedAt && (
                          <span className="ml-2 text-green-600">
                            · Resolved {new Date(log.resolvedAt).toLocaleString("en-IN")}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {!log.isResolved && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs shrink-0"
                      onClick={() => handleResolve(log.id)}
                    >
                      <CheckCircle size={11} className="mr-1" />
                      Resolve
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}