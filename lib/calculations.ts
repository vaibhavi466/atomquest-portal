import { UoMType, GoalStatus } from "@prisma/client"

// ─── Goal Validation ─────────────────────────────────────────────────────────

export interface GoalInput {
  weightage: number
  uomType?: string
  target?: number
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateGoalSet(goals: GoalInput[]): ValidationResult {
  const errors: string[] = []

  // Rule 1: Max 8 goals
  if (goals.length > 8) {
    errors.push("Maximum 8 goals allowed per cycle.")
  }

  // Rule 2: Minimum 10% per goal
  const belowMin = goals.filter((g) => g.weightage < 10)
  if (belowMin.length > 0) {
    errors.push("Each goal must have a minimum weightage of 10%.")
  }

  // Rule 3: Total must equal exactly 100%
  const total = goals.reduce((sum, g) => sum + Number(g.weightage), 0)
  if (Math.abs(total - 100) > 0.01) {
    errors.push(`Total weightage must equal 100%. Current total: ${total.toFixed(1)}%`)
  }

  return { valid: errors.length === 0, errors }
}

export function getRemainingWeightage(goals: GoalInput[], excludeIndex?: number): number {
  const total = goals.reduce((sum, g, i) => {
    if (i === excludeIndex) return sum
    return sum + Number(g.weightage)
  }, 0)
  return Math.max(0, 100 - total)
}

// ─── Progress Score Engine ────────────────────────────────────────────────────

export function calculateScore(
  uomType: string,
  target: number | null,
  actual: number | null,
  deadline?: Date | null,
  completionDate?: Date | null
): number {
  if (uomType === "TIMELINE") {
    if (!deadline || !completionDate) return 0

    const deadlineMs = new Date(deadline).getTime()
    const completionMs = new Date(completionDate).getTime()

    if (Number.isNaN(deadlineMs) || Number.isNaN(completionMs)) return 0

    return completionMs <= deadlineMs ? 100 : 0
  }

  if (actual === null || actual === undefined) return 0
  if (target === null || target === undefined) return 0
  switch (uomType) {
    case "MIN": {
      // Higher actual = better (e.g. sales revenue)
      if (target === 0) return 0
      return Math.min(Math.round((actual / target) * 100), 100)
    }

    case "MAX": {
      // Lower actual = better (e.g. TAT, defect count)
      if (actual === 0) return 100
      return Math.min(Math.round((target / actual) * 100), 100)
    }

    case "ZERO": {
      // Actual must be zero for full score
      return actual === 0 ? 100 : 0
    }

    case "TIMELINE": {
      return 0 // Timeline scoring handled separately above
    }

    default:
      return 0
  }
}

// ─── Weighted Overall Score ───────────────────────────────────────────────────

export interface GoalScore {
  score: number
  weightage: number
}

export function calculateOverallScore(goalScores: GoalScore[]): number {
  if (goalScores.length === 0) return 0
  const weighted = goalScores.reduce((sum, g) => {
    return sum + (g.score * g.weightage) / 100
  }, 0)
  return Math.round(weighted * 10) / 10
}

// ─── Score Color Helper ───────────────────────────────────────────────────────

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600"
  if (score >= 60) return "text-amber-600"
  if (score >= 40) return "text-orange-600"
  return "text-red-600"
}

export function getScoreBadgeVariant(score: number): "default" | "secondary" | "destructive" | "outline" {
  if (score >= 80) return "default"
  if (score >= 60) return "secondary"
  return "destructive"
}

// ─── UoM Label Helper ─────────────────────────────────────────────────────────

export const UOM_LABELS: Record<string, { label: string; hint: string; targetLabel: string }> = {
  MIN: {
    label: "Minimize (Higher is Better)",
    hint: "Score improves as actual value approaches or exceeds target",
    targetLabel: "Target Value",
  },
  MAX: {
    label: "Maximize (Lower is Better)",
    hint: "Score improves as actual value stays below target (e.g. reduce TAT to 48hrs)",
    targetLabel: "Max Allowed Value",
  },
  ZERO: {
    label: "Zero-Based (Zero = Full Score)",
    hint: "Full score only if actual value is zero (e.g. zero incidents)",
    targetLabel: "Target (must be 0)",
  },
  TIMELINE: {
    label: "Timeline (Date-based)",
    hint: "Full score if completed on or before deadline. -5 points per day late",
    targetLabel: "Deadline Date",
  },
}