interface ProgressRingProps {
  score: number
  size?: number
  strokeWidth?: number
}

export function ProgressRing({ score, size = 64, strokeWidth = 6 }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const color =
    score >= 80 ? "#16a34a"
    : score >= 60 ? "#d97706"
    : score >= 40 ? "#ea580c"
    : "#dc2626"

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      {/* Score text in center */}
      <span
        className="absolute text-xs font-semibold tabular-nums"
        style={{ color }}
      >
        {score.toFixed(0)}%
      </span>
    </div>
  )
}