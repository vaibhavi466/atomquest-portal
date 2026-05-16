"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollText, Search } from "lucide-react"

const ROLE_COLORS: Record<string, string> = {
  ADMIN:    "bg-purple-100 text-purple-700",
  MANAGER:  "bg-blue-100 text-blue-700",
  EMPLOYEE: "bg-slate-100 text-slate-600",
}

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    // Fetch audit logs via achievement report which includes them
    axios.get("/api/admin/reports/achievement").then((res) => {
      // Flatten all audit logs from all goals
      const allLogs: any[] = []
      res.data.forEach((user: any) => {
        // We'll fetch audit logs separately
      })
      setLoading(false)
    })

    // Direct audit log fetch
    axios.get("/api/audit/all").then((res) => {
      setLogs(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = logs.filter(
    (log) =>
      search === "" ||
      log.goal?.title?.toLowerCase().includes(search.toLowerCase()) ||
      log.changedBy?.name?.toLowerCase().includes(search.toLowerCase()) ||
      log.field?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="p-8 text-slate-400">Loading audit trail...</div>

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Audit Trail</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Complete history of all changes made to goals — manager edits, returns, unlocks
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <Input
          placeholder="Search by goal, person, or field..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
          <ScrollText size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            {logs.length === 0 ? "No audit logs yet" : "No results match your search"}
          </p>
          <p className="text-slate-400 text-sm mt-1">
            Audit logs are created when managers edit, return, or unlock goals
          </p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((log) => (
          <Card key={log.id} className="overflow-hidden">
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    <ScrollText size={13} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900">
                        {log.changedBy?.name}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          ROLE_COLORS[log.changedBy?.role] || ROLE_COLORS.EMPLOYEE
                        }`}
                      >
                        {log.changedBy?.role}
                      </span>
                      <span className="text-xs text-slate-400">changed</span>
                      <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {log.field}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      Goal:{" "}
                      <span className="font-medium text-slate-700">
                        {log.goal?.title}
                      </span>
                    </p>
                    {log.reason && (
                      <p className="text-xs text-slate-400 mt-0.5 italic">
                        "{log.reason}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center gap-2 justify-end text-xs">
                    <span className="text-slate-400 line-through">{log.oldValue}</span>
                    <span className="text-slate-300">→</span>
                    <span className="font-medium text-slate-700">{log.newValue}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(log.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}