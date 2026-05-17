import { prisma } from "@/lib/prisma"
import { EscalationTrigger, GoalStatus, Quarter } from "@prisma/client"

// ─── Main escalation checker ─────────────────────────────────────────────────
// Called by the cron job or manually from admin panel
export async function runEscalationCheck(): Promise<{
  checked: number
  escalated: number
  details: string[]
}> {
  const now = new Date()
  const details: string[] = []
  let escalated = 0
  let checked = 0

  const activeRules = await prisma.escalationRule.findMany({
    where: { isActive: true },
  })

  for (const rule of activeRules) {
    const thresholdDate = new Date(now)
    thresholdDate.setDate(thresholdDate.getDate() - rule.daysThreshold)

    if (rule.triggerType === EscalationTrigger.GOAL_NOT_SUBMITTED) {
      // Find employees who have NO submitted/approved/locked goals
      // and have been in the system for more than daysThreshold
      const employees = await prisma.user.findMany({
        where: {
          role: "EMPLOYEE",
          createdAt: { lte: thresholdDate },
        },
        include: {
          goals: { select: { status: true } },
          manager: { select: { id: true, name: true } },
        },
      })

      for (const emp of employees) {
        checked++
        const hasSubmitted = emp.goals.some((g) =>
          ["SUBMITTED", "APPROVED", "LOCKED"].includes(g.status)
        )
        if (!hasSubmitted) {
          const existing = await prisma.escalationLog.findFirst({
            where: {
              targetUserId: emp.id,
              triggerType: EscalationTrigger.GOAL_NOT_SUBMITTED,
              isResolved: false,
              createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
            },
          })
          if (!existing) {
            await createEscalationLog({
              ruleId: rule.id,
              targetUserId: emp.id,
              notifiedUserId: emp.managerId || emp.id,
              triggerType: rule.triggerType,
              message: `${emp.name} has not submitted any goals after ${rule.daysThreshold} days of cycle opening.`,
              level: 1,
            })
            escalated++
            details.push(`[GOAL_NOT_SUBMITTED] ${emp.name}`)
          }
        }
      }
    }

    if (rule.triggerType === EscalationTrigger.GOAL_NOT_APPROVED) {
      // Find goals that have been in SUBMITTED status for more than daysThreshold
      const staleGoals = await prisma.goal.findMany({
        where: {
          status: GoalStatus.SUBMITTED,
          updatedAt: { lte: thresholdDate },
        },
        include: {
          user: {
            include: { manager: { select: { id: true, name: true } } },
          },
        },
      })

      const alreadyEscalated = new Set<string>()
      for (const goal of staleGoals) {
        checked++
        const empId = goal.userId
        if (alreadyEscalated.has(empId)) continue
        alreadyEscalated.add(empId)

        const existing = await prisma.escalationLog.findFirst({
          where: {
            targetUserId: empId,
            triggerType: EscalationTrigger.GOAL_NOT_APPROVED,
            isResolved: false,
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
        })
        if (!existing) {
          await createEscalationLog({
            ruleId: rule.id,
            targetUserId: empId,
            notifiedUserId: goal.user.managerId || empId,
            triggerType: rule.triggerType,
            message: `${goal.user.name}'s goals have been awaiting approval for ${rule.daysThreshold}+ days.`,
            level: 1,
          })
          escalated++
          details.push(`[GOAL_NOT_APPROVED] ${goal.user.name}`)
        }
      }
    }

    if (rule.triggerType === EscalationTrigger.CHECKIN_NOT_COMPLETED) {
      // Find locked goals with no check-in in the current active quarter
      const activeQuarter = getActiveQuarter()
      if (!activeQuarter) continue

      const goalsWithNoCheckin = await prisma.goal.findMany({
        where: {
          status: GoalStatus.LOCKED,
          updatedAt: { lte: thresholdDate },
          checkins: {
            none: { quarter: activeQuarter as Quarter },
          },
        },
        include: {
          user: {
            include: { manager: { select: { id: true } } },
          },
        },
      })

      const alreadyEscalated = new Set<string>()
      for (const goal of goalsWithNoCheckin) {
        checked++
        const empId = goal.userId
        if (alreadyEscalated.has(empId)) continue
        alreadyEscalated.add(empId)

        const existing = await prisma.escalationLog.findFirst({
          where: {
            targetUserId: empId,
            triggerType: EscalationTrigger.CHECKIN_NOT_COMPLETED,
            isResolved: false,
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
        })
        if (!existing) {
          await createEscalationLog({
            ruleId: rule.id,
            targetUserId: empId,
            notifiedUserId: goal.user.managerId || empId,
            triggerType: rule.triggerType,
            message: `${goal.user.name} has not completed the ${activeQuarter} check-in after ${rule.daysThreshold} days.`,
            level: 1,
          })
          escalated++
          details.push(`[CHECKIN_NOT_COMPLETED] ${goal.user.name} (${activeQuarter})`)
        }
      }
    }
  }

  return { checked, escalated, details }
}

async function createEscalationLog(data: {
  ruleId: string
  targetUserId: string
  notifiedUserId: string
  triggerType: EscalationTrigger
  message: string
  level: number
}) {
  return prisma.escalationLog.create({ data })
}

function getActiveQuarter(): string | null {
  const month = new Date().getMonth() + 1
  if (month >= 7 && month <= 9)  return "Q1"
  if (month >= 10 && month <= 12) return "Q2"
  if (month >= 1 && month <= 3)  return "Q3"
  if (month >= 4 && month <= 6)  return "Q4"
  return null
}