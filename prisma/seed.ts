import { PrismaClient, Role, UoMType, GoalStatus, CheckinStatus, Quarter } from "@prisma/client"
import bcrypt from "bcryptjs"


const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  const password = await bcrypt.hash("Demo@123", 12)

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@demo.com",
      password,
      role: Role.ADMIN,
      department: "HR",
    },
  })

  // Create Manager
  const manager = await prisma.user.upsert({
    where: { email: "manager@demo.com" },
    update: {},
    create: {
      name: "Priya Sharma",
      email: "manager@demo.com",
      password,
      role: Role.MANAGER,
      department: "Sales",
    },
  })

  // Create Employee (reporting to manager)
  const employee = await prisma.user.upsert({
    where: { email: "employee@demo.com" },
    update: {},
    create: {
      name: "Rahul Verma",
      email: "employee@demo.com",
      password,
      role: Role.EMPLOYEE,
      department: "Sales",
      managerId: manager.id,
    },
  })

  // Create an active cycle
  await prisma.cycle.upsert({
    where: { id: "cycle-2025" },
    update: {},
    create: {
      id: "cycle-2025",
      name: "2025-26 Annual Cycle",
      year: 2025,
      goalOpenDate: new Date("2025-05-01"),
      goalCloseDate: new Date("2025-05-31"),
      q1Start: new Date("2025-07-01"),
      q2Start: new Date("2025-10-01"),
      q3Start: new Date("2026-01-01"),
      q4Start: new Date("2026-03-01"),
      isActive: true,
    },
  })

  // Create goals for employee — APPROVED (to show full journey)
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

  // Add a Q1 checkin for goal1 (to show progress tracking)
  await prisma.checkin.create({
    data: {
      goalId: goal1.id,
      userId: employee.id,
      quarter: Quarter.Q1,
      actual: 3200000,
      status: CheckinStatus.ON_TRACK,
      score: 64.0,
      managerComment: "Good start Rahul. Push harder in Q2 to close the gap.",
    },
  })

  // Create a SUBMITTED goal for manager to demo approval flow
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
        description: "Finish Salesforce admin certification",
        uomType: UoMType.TIMELINE,
        target: 0,
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

  // Add Q2 and Q3 check-ins for richer analytics charts
  const allGoals = await prisma.goal.findMany({
    where: { userId: employee.id, status: GoalStatus.LOCKED },
  })

  const goal1Locked = allGoals.find((g) => g.title === "Achieve Sales Target Q1")
  const goal2Locked = allGoals.find((g) => g.title === "Improve Customer Retention Rate")
  const goal3Locked = allGoals.find((g) => g.title === "Reduce TAT for Proposals")
  const goal4Locked = allGoals.find((g) => g.title === "Zero Safety Incidents")

  if (goal2Locked) {
    await prisma.checkin.upsert({
      where: { goalId_quarter: { goalId: goal2Locked.id, quarter: Quarter.Q1 } },
      update: {},
      create: {
        goalId: goal2Locked.id,
        userId: employee.id,
        quarter: Quarter.Q1,
        actual: 88,
        status: CheckinStatus.ON_TRACK,
        score: 97.8,
        managerComment: "Very close to target. Keep it up.",
      },
    })

    await prisma.checkin.upsert({
      where: { goalId_quarter: { goalId: goal2Locked.id, quarter: Quarter.Q2 } },
      update: {},
      create: {
        goalId: goal2Locked.id,
        userId: employee.id,
        quarter: Quarter.Q2,
        actual: 91,
        status: CheckinStatus.COMPLETED,
        score: 100,
      },
    })
  }

  if (goal3Locked) {
    await prisma.checkin.upsert({
      where: { goalId_quarter: { goalId: goal3Locked.id, quarter: Quarter.Q1 } },
      update: {},
      create: {
        goalId: goal3Locked.id,
        userId: employee.id,
        quarter: Quarter.Q1,
        actual: 36,
        status: CheckinStatus.ON_TRACK,
        score: 100,
        managerComment: "Excellent — well below the 48hr target.",
      },
    })
  }

  if (goal4Locked) {
    await prisma.checkin.upsert({
      where: { goalId_quarter: { goalId: goal4Locked.id, quarter: Quarter.Q1 } },
      update: {},
      create: {
        goalId: goal4Locked.id,
        userId: employee.id,
        quarter: Quarter.Q1,
        actual: 0,
        status: CheckinStatus.COMPLETED,
        score: 100,
      },
    })

    await prisma.checkin.upsert({
      where: { goalId_quarter: { goalId: goal4Locked.id, quarter: Quarter.Q2 } },
      update: {},
      create: {
        goalId: goal4Locked.id,
        userId: employee.id,
        quarter: Quarter.Q2,
        actual: 0,
        status: CheckinStatus.COMPLETED,
        score: 100,
      },
    })
  }

  // Seed default escalation rules
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
      update: {},
      create: rule,
    })
  }

  console.log("✅ Escalation rules seeded")


  console.log("✅ Seeding complete!")
  console.log("\n📋 Demo Credentials:")
  console.log("  Employee → employee@demo.com / Demo@123")
  console.log("  Manager  → manager@demo.com  / Demo@123")
  console.log("  Admin    → admin@demo.com    / Demo@123")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())