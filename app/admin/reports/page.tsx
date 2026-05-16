"use client"

import { useEffect, useState } from "react"
import axios from "axios"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8",
  SUBMITTED: "#f59e0b",
  APPROVED: "#10b981",
  LOCKED: "#3b82f6",
  RETURNED: "#ef4444",
}

// CHANGE: Centralized chart colors for department pie chart.
const DEPARTMENT_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
]

type Summary = {
  totalUsers: number
  totalGoals: number
  approvalRate: number
  checkinRate: number
}

type DepartmentBreakdown = {
  department: string
  count: number
}

type GoalStatusCount = {
  status: string
  count: number
}

type CheckinQuarterData = {
  quarter: string
  count: number
  avgScore: number
}

type ReportsData = {
  summary: Summary
  deptBreakdown: DepartmentBreakdown[]
  goalsByStatus: GoalStatusCount[]
  checkinsByQuarter: CheckinQuarterData[]
}

// CHANGE: Added proper type for Recharts Pie label callback.
// This fixes TypeScript errors on `department` and `percent`.
type PieLabelProps = {
  department?: string
  percent?: number
}

function formatStatusLabel(value: string) {
  if (value === "NOT_STARTED") return "Not Started"
  if (value === "ON_TRACK") return "On Track"

  return value.charAt(0) + value.slice(1).toLowerCase()
}

export default function ReportsPage() {
  // CHANGE: Replaced `any` with a strict ReportsData type.
  // This prevents TypeScript errors and makes chart data safer.
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchReports() {
      try {
        setLoading(true)
        setError("")

        const res = await axios.get<ReportsData>("/api/admin/reports/completion")
        setData(res.data)
      } catch (err) {
        console.error("ADMIN_REPORTS_FETCH_ERROR:", err)
        setError("Failed to load reports. Please refresh and try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [])

  if (loading) {
    return <div className="p-8 text-slate-400">Loading reports...</div>
  }

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>
  }

  if (!data) {
    return <div className="p-8 text-slate-400">No report data available.</div>
  }

  const {
    summary,
    deptBreakdown = [],
    goalsByStatus = [],
    checkinsByQuarter = [],
  } = data

  const summaryCards = [
    {
      label: "Employees",
      value: summary.totalUsers,
    },
    {
      label: "Total Goals",
      value: summary.totalGoals,
    },
    {
      label: "Approval Rate",
      value: `${summary.approvalRate}%`,
    },
    {
      label: "Check-in Rate",
      value: `${summary.checkinRate}%`,
    },
  ]

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Completion Dashboard
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Real-time goal tracking status across the organisation
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-5">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="text-2xl font-semibold text-slate-900 mt-1">
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
        {/* Goals by Status — Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              Goals by Status
            </CardTitle>
          </CardHeader>

          <CardContent>
            {goalsByStatus.length === 0 ? (
              <p className="text-sm text-slate-400 py-16 text-center">
                No goal status data available.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={goalsByStatus}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

                  <XAxis
                    dataKey="status"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickFormatter={formatStatusLabel}
                  />

                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />

                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "0.5px solid #e2e8f0",
                    }}
                  />

                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {goalsByStatus.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLORS[entry.status] || "#94a3b8"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Check-ins by Quarter — Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              Check-ins by Quarter
            </CardTitle>
          </CardHeader>

          <CardContent>
            {checkinsByQuarter.length === 0 ? (
              <p className="text-sm text-slate-400 py-16 text-center">
                No check-in data available.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={checkinsByQuarter}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

                  <XAxis
                    dataKey="quarter"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                  />

                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                  />

                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                  />

                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "0.5px solid #e2e8f0",
                    }}
                  />

                  <Legend wrapperStyle={{ fontSize: 11 }} />

                  <Bar
                    yAxisId="left"
                    dataKey="count"
                    name="Check-ins"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                  />

                  <Bar
                    yAxisId="right"
                    dataKey="avgScore"
                    name="Avg Score %"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Department Breakdown — Pie Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-700">
            Employees by Department
          </CardTitle>
        </CardHeader>

        <CardContent>
          {deptBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 py-16 text-center">
              No department data available.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={deptBreakdown}
                  dataKey="count"
                  nameKey="department"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  // CHANGE: Typed the label callback safely.
                  // This fixes the TS error on `department` and `percent`.
                  label={(props: PieLabelProps) => {
                    const department = props.department ?? "Unknown"
                    const percent = props.percent ?? 0

                    return `${department} (${(percent * 100).toFixed(0)}%)`
                  }}
                  labelLine={false}
                >
                  {deptBreakdown.map((entry, index) => (
                    <Cell
                      key={entry.department || index}
                      fill={
                        DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]
                      }
                    />
                  ))}
                </Pie>

                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "0.5px solid #e2e8f0",
                  }}
                />

                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}