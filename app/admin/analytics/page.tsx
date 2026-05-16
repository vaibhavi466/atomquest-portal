"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScoreBadge } from "@/components/shared/ScoreBadge"
import { ProgressRing } from "@/components/shared/ProgressRing"
import { TrendingUp, Award, Target, Users } from "lucide-react"

// ─── Color palette ────────────────────────────────────────────────────────────
const COLORS = {
  primary:  "#6366f1",
  success:  "#10b981",
  warning:  "#f59e0b",
  danger:   "#ef4444",
  blue:     "#0ea5e9",
  purple:   "#8b5cf6",
}

const QUARTER_COLORS = [
  COLORS.primary,
  COLORS.blue,
  COLORS.success,
  COLORS.warning,
]

const PIE_COLORS = [
  "#6366f1", "#0ea5e9", "#10b981",
  "#f59e0b", "#ef4444", "#8b5cf6",
]

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm text-xs">
      <p className="font-medium text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{p.value}%</span>
        </p>
      ))}
    </div>
  )
}

// ─── Heatmap Cell ─────────────────────────────────────────────────────────────
function HeatCell({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <div className="h-9 w-full rounded-md bg-slate-100 flex items-center justify-center">
        <span className="text-xs text-slate-300">—</span>
      </div>
    )
  }
  const bg =
    value >= 80 ? "bg-green-100 text-green-700"
    : value >= 60 ? "bg-amber-100 text-amber-700"
    : value >= 40 ? "bg-orange-100 text-orange-700"
    : "bg-red-100 text-red-700"

  return (
    <div
      className={`h-9 w-full rounded-md flex items-center justify-center ${bg}`}
    >
      <span className="text-xs font-semibold">{value}%</span>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get("/api/analytics").then((res) => {
      setData(res.data)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-3 text-slate-400">
        <div className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
        Loading analytics...
      </div>
    )
  }

  const {
    qoqTrend,
    thrustBreakdown,
    scoreDistribution,
    leaderboard,
    heatmap,
    uomDistribution,
    meta,
  } = data

  // Filter QoQ trend to only quarters with actual data
  const activeQoQ = qoqTrend.filter((q: any) => q.checkinsLogged > 0)

  return (
    <div className="p-8 max-w-7xl space-y-6">

      {/* ── Header ── */}
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-slate-900">
          Analytics Dashboard
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          {meta.totalEmployees} employees ·{" "}
          {meta.totalGoals} approved goals ·{" "}
          {meta.totalCheckins} check-ins logged
        </p>
      </div>

      {/* ── Row 1: QoQ Trend + Score Distribution ── */}
      <div className="grid grid-cols-2 gap-6">

        {/* QoQ Trend — Line Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-500" />
              <CardTitle className="text-sm font-medium text-slate-700">
                Quarter-on-Quarter Score Trend
              </CardTitle>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Average achievement score across all employees per quarter
            </p>
          </CardHeader>
          <CardContent>
            {activeQoQ.length === 0 ? (
              <div className="h-52 flex items-center justify-center">
                <p className="text-sm text-slate-400">
                  No check-ins logged yet — data will appear here
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={activeQoQ}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="quarter"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="avgScore"
                    name="Avg Score"
                    stroke={COLORS.primary}
                    strokeWidth={2.5}
                    dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Score Distribution — Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-blue-500" />
              <CardTitle className="text-sm font-medium text-slate-700">
                Score Distribution
              </CardTitle>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Number of employees in each performance band
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={scoreDistribution}
                margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="band"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "0.5px solid #e2e8f0",
                  }}
                  formatter={(v: any) => [`${v} employees`, "Count"]}
                />
                <Bar dataKey="count" name="Employees" radius={[4, 4, 0, 0]}>
                  {scoreDistribution.map((_: any, i: number) => (
                    <Cell
                      key={i}
                      fill={
                        i === 3
                          ? COLORS.success
                          : i === 2
                          ? COLORS.warning
                          : i === 1
                          ? "#f97316"
                          : COLORS.danger
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Thrust Area Breakdown + UoM Distribution ── */}
      <div className="grid grid-cols-3 gap-6">

        {/* Thrust Area — Horizontal Bar */}
        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-teal-500" />
              <CardTitle className="text-sm font-medium text-slate-700">
                Performance by Thrust Area
              </CardTitle>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Average score and goal count per strategic area
            </p>
          </CardHeader>
          <CardContent>
            {thrustBreakdown.length === 0 ? (
              <div className="h-52 flex items-center justify-center">
                <p className="text-sm text-slate-400">No data yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {thrustBreakdown.map((item: any) => (
                  <div key={item.thrustArea}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700 truncate max-w-[60%]">
                        {item.thrustArea}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">
                          {item.goalCount} goal{item.goalCount !== 1 ? "s" : ""}
                        </span>
                        {item.avgScore > 0 && (
                          <ScoreBadge score={item.avgScore} size="sm" />
                        )}
                        {item.avgScore === 0 && (
                          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            No check-ins
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          item.avgScore >= 80
                            ? "bg-green-500"
                            : item.avgScore >= 60
                            ? "bg-amber-500"
                            : item.avgScore >= 40
                            ? "bg-orange-400"
                            : item.avgScore > 0
                            ? "bg-red-400"
                            : "bg-slate-200"
                        }`}
                        style={{ width: `${item.avgScore}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* UoM Distribution — Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              Goal Type Mix
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Distribution by measurement type
            </p>
          </CardHeader>
          <CardContent>
            {uomDistribution.length === 0 ? (
              <div className="h-48 flex items-center justify-center">
                <p className="text-sm text-slate-400">No data yet</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={uomDistribution}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                    >
                      {uomDistribution.map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "0.5px solid #e2e8f0",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom legend */}
                <div className="space-y-1.5 mt-2">
                  {uomDistribution.map((item: any, i: number) => (
                    <div
                      key={item.type}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-sm"
                          style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="text-slate-600">{item.label}</span>
                      </div>
                      <span className="font-medium text-slate-800">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Leaderboard + QoQ Check-in Count ── */}
      <div className="grid grid-cols-2 gap-6">

        {/* Leaderboard */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Award size={16} className="text-amber-500" />
              <CardTitle className="text-sm font-medium text-slate-700">
                Performance Leaderboard
              </CardTitle>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Top performers by overall weighted score
            </p>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400">
                  No scores yet — check-ins needed first
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((emp: any, i: number) => (
                  <div
                    key={emp.name}
                    className="flex items-center gap-3"
                  >
                    {/* Rank */}
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        i === 0
                          ? "bg-amber-100 text-amber-700"
                          : i === 1
                          ? "bg-slate-200 text-slate-600"
                          : i === 2
                          ? "bg-orange-100 text-orange-600"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {i + 1}
                    </div>

                    {/* Name + bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-800 truncate">
                          {emp.name}
                        </span>
                        <ScoreBadge score={emp.score} size="sm" />
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            emp.score >= 80
                              ? "bg-green-500"
                              : emp.score >= 60
                              ? "bg-amber-500"
                              : "bg-red-400"
                          }`}
                          style={{ width: `${emp.score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Check-in Completion Heatmap */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-700">
              Score Heatmap — Employee × Quarter
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Average score per employee per quarter
            </p>
          </CardHeader>
          <CardContent>
            {heatmap.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400">No data yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left font-medium text-slate-500 pb-2 pr-3 w-24">
                        Employee
                      </th>
                      {["Q1", "Q2", "Q3", "Q4", "ANNUAL"].map((q) => (
                        <th
                          key={q}
                          className="text-center font-medium text-slate-500 pb-2 px-1"
                        >
                          {q}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmap.map((row: any) => (
                      <tr key={row.name}>
                        <td className="pr-3 py-1">
                          <span className="font-medium text-slate-700 truncate block max-w-[80px]">
                            {row.name}
                          </span>
                        </td>
                        {["Q1", "Q2", "Q3", "Q4", "ANNUAL"].map((q) => (
                          <td key={q} className="px-1 py-1">
                            <HeatCell value={row[q]} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Legend */}
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-400">Legend:</span>
                  {[
                    { label: "≥80%", color: "bg-green-100 text-green-700" },
                    { label: "60–79%", color: "bg-amber-100 text-amber-700" },
                    { label: "40–59%", color: "bg-orange-100 text-orange-700" },
                    { label: "<40%", color: "bg-red-100 text-red-700" },
                    { label: "No data", color: "bg-slate-100 text-slate-400" },
                  ].map(({ label, color }) => (
                    <div
                      key={label}
                      className={`text-xs px-2 py-0.5 rounded ${color}`}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: QoQ Check-in Volume ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-700">
            Check-in Volume by Quarter
          </CardTitle>
          <p className="text-xs text-slate-400 mt-0.5">
            Number of check-ins logged per quarter vs average score trend
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={qoqTrend}
              margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="quarter"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                allowDecimals={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value) =>
                  value === "checkinsLogged" ? "Check-ins" : "Avg Score %"
                }
              />
              <Bar
                yAxisId="left"
                dataKey="checkinsLogged"
                name="checkinsLogged"
                fill={COLORS.primary}
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgScore"
                name="avgScore"
                stroke={COLORS.success}
                strokeWidth={2}
                dot={{ r: 4, fill: COLORS.success }}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

    </div>
  )
}