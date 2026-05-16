import { cn } from "@/lib/utils"

interface ScoreBadgeProps {
  score: number
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
}

export function ScoreBadge({ score, size = "md", showLabel = false }: ScoreBadgeProps) {
  const color =
    score >= 80 ? "bg-green-100 text-green-700 border-green-200"
    : score >= 60 ? "bg-amber-100 text-amber-700 border-amber-200"
    : score >= 40 ? "bg-orange-100 text-orange-700 border-orange-200"
    : "bg-red-100 text-red-700 border-red-200"

  const sizeClass =
    size === "sm" ? "text-xs px-2 py-0.5"
    : size === "lg" ? "text-lg px-4 py-1.5 font-semibold"
    : "text-sm px-2.5 py-1"

  return (
    <span className={cn("rounded-full border font-medium tabular-nums", color, sizeClass)}>
      {score.toFixed(1)}%
      {showLabel && (
        <span className="ml-1 font-normal opacity-70">
          {score >= 80 ? "Excellent" : score >= 60 ? "On Track" : score >= 40 ? "At Risk" : "Behind"}
        </span>
      )}
    </span>
  )
}