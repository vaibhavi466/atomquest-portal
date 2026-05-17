import {
  PrismaClient,
  Role,
  UoMType,
  GoalStatus,
  CheckinStatus,
  Quarter,
} from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  const password = await bcrypt.hash("Demo@123", 12)

  /**
   * 1. Reset demo users safely.
   * This is important because update: {} does not refresh passwords
   * if users already exist in production.
   */
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {
      name: "Admin User",
      password,
      role: Role.ADMIN,
      department: "HR",
      managerId: null,
    },
    create: {
      name: "Admin User",
      email: "admin@demo.com",
      password,
      role: Role.ADMIN,
      department: "HR",
    },
  })

  const manager = await prisma.user.upsert({
    where: { email: "manager@demo.com" },
    update: {
      name: "Priya Sharma",
      password,
      role: Role.MANAGER,
      department: "Sales",
      managerId: null,
    },
    create: {
      name: "Priya Sharma",
      email: "manager@demo.com",
      password,
      role: Role.MANAGER,
      department: "Sales",
    },
  })

  const employee = await prisma.user.upsert({
    where: { email: "employee@demo.com" },
    update: {
      name: "Rahul Verma",
      password,
      role: Role.EMPLOYEE,
      department: "Sales",
      managerId: manager.id,
    },
    create: {
      name: "Rahul Verma",
      email: "employee@demo.com",
      password,
      role: Role.EMPLOYEE,
      department: "Sales",
      managerId: manager.id,
    },
  })

  /**
   * 2. Keep only one active cycle.
   * This prevents old 2025 cycles from blocking goal creation.
   */
  await prisma.cycle.updateMany({
    where: {
      isActive: true,
      id: {
        not: "cycle-2026-demo",
      },
    },
    data: {
      isActive: false,
    },
  })

  /**
   * 3. Create/update an active demo cycle.
   * Goal window is intentionally open until 30 June 2026
   * so judges can test goal creation after deployment.
   */
  await prisma.cycle.upsert({
    where: { id: "cycle-2026-demo" },
    update: {
      name: "2026-27 Demo Annual Cycle",
      year: 2026,
      goalOpenDate: new Date("2026-05-01T00:00:00.000Z"),
      goalCloseDate: new Date("2026-06-30T23:59:59.999Z"),
      q1Start: new Date("2026-07-01T00:00:00.000Z"),
      q2Start: new Date("2026-10-01T00:00:00.000Z"),
      q3Start: new Date("2027-01-01T00:00:00.000Z"),
      q4Start: new Date("2027-03-01T00:00:00.000Z"),
      isActive: true,
    },
    create: {
      id: "cycle-2026-demo",
      name: "2026-27 Demo Annual Cycle",
      year: 2026,
      goalOpenDate: new Date("2026-05-01T00:00:00.000Z"),
      goalCloseDate: new Date("2026-06-30T23:59:59.999Z"),
      q1Start: new Date("2026-07-01T00:00:00.000Z"),
      q2Start: new Date("2026-10-01T00:00:00.000Z"),
      q3Start: new Date("2027-01-01T00:00:00.000Z"),
      q4Start: new Date("2027-03-01T00:00:00.000Z"),
      isActive: true,
    },
  })

  /**
   * 4. Clean only demo employee goals before reseeding.
   * This makes the seed idempotent and prevents duplicate cards.
   * Because Checkin and AuditLog have cascade delete from Goal,
   * deleting demo goals also removes their check-ins/audit logs.
   */
  await prisma.goal.deleteMany({
    where: {
      userId: employee.id,
    },
  })

  /**
   * 5. Create locked/approved goals for employee check-in demo.
   * Weightage total = 100.
   */
  const goal1 = await prisma.goal.create({
    data: {
      userId: employee.id,
      thrustArea: "Revenue Growth",
      title: "Achieve Sales Target Q1",
      description: "Close deals worth ₹50L in Q1",
      uomType: UoMType.MIN,
      target: 5000000,
      weightage: 40,
      status: GoalStatus.LOCKED,
    },
  })

  const goal2 = await prisma.goal.create({
    data: {
      userId: employee.id,
      thrustArea: "Customer Success",
      title: "Improve Customer Retention Rate",
      description: "Maintain 90%+ retention across accounts",
      uomType: UoMType.MIN,
      target: 90,
      weightage: 30,
      status: GoalStatus.LOCKED,
    },
  })

  const goal3 = await prisma.goal.create({
    data: {
      userId: employee.id,
      thrustArea: "Operational Efficiency",
      title: "Reduce TAT for Proposals",
      description: "Submit proposals within 48 hours",
      uomType: UoMType.MAX,
      target: 48,
      weightage: 20,
      status: GoalStatus.LOCKED,
    },
  })

  const goal4 = await prisma.goal.create({
    data: {
      userId: employee.id,
      thrustArea: "Safety",
      title: "Zero Safety Incidents",
      description: "Maintain zero safety violations",
      uomType: UoMType.ZERO,
      target: 0,
      weightage: 10,
      status: GoalStatus.LOCKED,
    },
  })

  /**
   * 6. Add check-ins for analytics/demo.
   */
  await prisma.checkin.createMany({
    data: [
      {
        goalId: goal1.id,
        userId: employee.id,
        quarter: Quarter.Q1,
        actual: 3200000,
        status: CheckinStatus.ON_TRACK,
        score: 64.0,
        managerComment: "Good start Rahul. Push harder in Q2 to close the gap.",
      },
      {
        goalId: goal2.id,
        userId: employee.id,
        quarter: Quarter.Q1,
        actual: 88,
        status: CheckinStatus.ON_TRACK,
        score: 97.8,
        managerComment: "Very close to target. Keep it up.",
      },
      {
        goalId: goal2.id,
        userId: employee.id,
        quarter: Quarter.Q2,
        actual: 91,
        status: CheckinStatus.COMPLETED,
        score: 100,
      },
      {
        goalId: goal3.id,
        userId: employee.id,
        quarter: Quarter.Q1,
        actual: 36,
        status: CheckinStatus.ON_TRACK,
        score: 100,
        managerComment: "Excellent — well below the 48hr target.",
      },
      {
        goalId: goal4.id,
        userId: employee.id,
        quarter: Quarter.Q1,
        actual: 0,
        status: CheckinStatus.COMPLETED,
        score: 100,
      },
      {
        goalId: goal4.id,
        userId: employee.id,
        quarter: Quarter.Q2,
        actual: 0,
        status: CheckinStatus.COMPLETED,
        score: 100,
      },
    ],
  })

  /**
   * 7. Create submitted goals for manager approval demo.
   * Weightage total = 100.
   */
  await prisma.goal.createMany({
    data: [
      {
        userId: employee.id,
        thrustArea: "Revenue Growth",
        title: "New Client Acquisition",
        description: "Onboard 5 new enterprise clients",
        uomType: UoMType.MIN,
        target: 5,
        weightage: 40,
        status: GoalStatus.SUBMITTED,
      },
      {
        userId: employee.id,
        thrustArea: "Learning & Development",
        title: "Complete CRM Certification",
        description: "Finish Salesforce admin certification before deadline",
        uomType: UoMType.TIMELINE,
        target: null,
        deadline: new Date("2026-06-20T00:00:00.000Z"),
        weightage: 30,
        status: GoalStatus.SUBMITTED,
      },
      {
        userId: employee.id,
        thrustArea: "Customer Success",
        title: "NPS Score Improvement",
        description: "Improve team NPS from 42 to 60",
        uomType: UoMType.MIN,
        target: 60,
        weightage: 30,
        status: GoalStatus.SUBMITTED,
      },
    ],
  })

  const escalationRules = [
    {
      id: "rule-goal-submission",
      name: "Goal Not Submitted After Cycle Open",
      triggerType: "GOAL_NOT_SUBMITTED" as const,
      daysThreshold: 7,
      isActive: true,
    },
    {
      id: "rule-goal-approval",
      name: "Goal Not Approved by Manager",
      triggerType: "GOAL_NOT_APPROVED" as const,
      daysThreshold: 5,
      isActive: true,
    },
    {
      id: "rule-checkin-completion",
      name: "Quarterly Check-in Not Completed",
      triggerType: "CHECKIN_NOT_COMPLETED" as const,
      daysThreshold: 10,
      isActive: true,
    },
  ]

  for (const rule of escalationRules) {
    await prisma.escalationRule.upsert({
      where: { id: rule.id },
      update: {
        name: rule.name,
        triggerType: rule.triggerType,
        daysThreshold: rule.daysThreshold,
        isActive: rule.isActive,
      },
      create: rule,
    })
  }

  console.log("Database seeding completed.")
}

main()
  .catch((error) => {
    console.error("Seed failed:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })