# GoalTrack - AtomQuest Hackathon 1.0

> In-House Goal Setting & Tracking Portal built for **AtomQuest Hackathon 1.0**.

GoalTrack is a role-based web portal that digitizes the complete employee goal lifecycle: goal creation, manager approval, locked goal governance, shared departmental KPIs, quarterly check-ins, manager comments, audit trails, and admin reporting.

---

## 1. Submission Links

| Item | Link |
|---|---|
| Live Demo | `atomquest-portal-lac.vercel.app` |
| Source Code | `https://github.com/vaibhavi466/atomquest-portal.git` |
| Architecture Diagram | Included below |

---

## 2. Demo Credentials

| Role | Email | Password |
|---|---|---|
| Employee | `employee@demo.com` | `Demo@123` |
| Manager | `manager@demo.com` | `Demo@123` |
| Admin | `admin@demo.com` | `Demo@123` |

Microsoft Entra ID SSO support is integrated as an optional enterprise feature. For a stable hackathon demo, use the credential login accounts above.

---

## 3. Problem Statement Coverage

### Phase 1 - Goal Creation & Approval

- Employee goal creation with thrust area, title, description, UoM, target, and weightage.
- UoM support: `MIN`, `MAX`, `TIMELINE`, `ZERO`.
- Enforced rules:
  - Total editable goal weightage must equal `100%` before submission.
  - Minimum individual goal weightage is `10%`.
  - Maximum editable goals per employee is `8`.
- Manager approval workflow:
  - Review submitted goals.
  - Inline edit targets/weightage.
  - Return goals for rework with reason.
  - Approve goals and lock them from employee edits.
- Shared goals:
  - Manager/Admin can push shared departmental KPIs.
  - Employee recipients can edit only weightage.
  - Goal title, thrust area, UoM, description, and target remain locked.

### Phase 2 - Achievement Tracking & Quarterly Check-ins

- Employees log actual achievement by quarter.
- Status options: `NOT_STARTED`, `ON_TRACK`, `COMPLETED`.
- Manager check-in dashboard:
  - Planned vs actual visibility.
  - System-computed score display.
  - Structured manager comment saving.
- Duplicate check-ins are prevented through Prisma `upsert` on `(goalId, quarter)`.

### Reporting & Governance

- Admin completion dashboard.
- Goal status distribution and check-in reporting.
- User management and reporting hierarchy management.
- AuditLog model for controlled changes and manager actions.
- Export-ready report architecture.

---

## 4. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript |
| UI | Tailwind CSS, shadcn/ui, lucide-react |
| Charts | Recharts |
| Authentication | NextAuth/Auth.js Credentials Provider, optional Microsoft Entra ID Provider |
| Database | PostgreSQL on Neon |
| ORM | Prisma |
| Deployment Target | Vercel + Neon |

---

## 5. Architecture

```mermaid
flowchart LR
    A[Employee / Manager / Admin] --> B[Next.js App Router UI]
    B --> C[Role Protected Routes]
    C --> D[Next.js API Routes]
    D --> E[Prisma ORM]
    E --> F[(Neon PostgreSQL)]

    D --> G[Goals API]
    D --> H[Check-ins API]
    D --> I[Admin Reports API]
    D --> J[Audit Logs]

    K[NextAuth/Auth.js] --> C
    L[Microsoft Entra ID Optional SSO] --> K
```

### Core Data Entities

| Entity | Purpose |
|---|---|
| `User` | Employee, Manager, Admin profiles and reporting hierarchy |
| `Goal` | Goal sheet items, targets, UoM, weightage, status, shared-goal metadata |
| `Checkin` | Quarterly actual achievement, status, score, manager comment |
| `AuditLog` | Change tracking for governance and approval history |
| `Cycle` | Annual/quarterly cycle configuration |

---

## 6. Scoring Logic

| UoM Type | Meaning | Formula / Logic |
|---|---|---|
| `MIN` | Higher is better | `Actual / Target`, capped at 100% |
| `MAX` | Lower is better | `Target / Actual` |
| `TIMELINE` | Completion by deadline | Completion date compared with deadline |
| `ZERO` | Zero is success | `Actual = 0 => 100%`, otherwise `0%` |

---

## 7. Main User Journeys

### Employee Journey

1. Login as Employee.
2. Create goals with thrust area, UoM, target, and weightage.
3. Submit only when total editable weightage is exactly `100%`.
4. View locked goals after manager approval.
5. Enter quarterly actual achievement.
6. View computed scores and manager comments.

### Manager Journey

1. Login as Manager.
2. Review submitted goals from direct reports.
3. Edit target/weightage inline when needed.
4. Approve or return goals with feedback.
5. Push shared goals to selected employees.
6. Review check-ins and save manager comments.

### Admin Journey

1. Login as Admin.
2. Manage users, roles, departments, and manager hierarchy.
3. View completion dashboards and organization-level reports.
4. Monitor governance and audit-ready data.

---

## 8. Local Setup

### Prerequisites

- Node.js 22+
- npm
- PostgreSQL database URL, preferably Neon

### Installation

```bash
npm install
```

### Environment Variables

Create `.env` in the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
AUTH_SECRET="replace-with-a-secure-secret"
NEXTAUTH_SECRET="replace-with-a-secure-secret"
AUTH_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"

# Optional Microsoft Entra ID SSO
AZURE_AD_CLIENT_ID="optional-client-id"
AZURE_AD_CLIENT_SECRET="optional-client-secret-value"
AZURE_AD_TENANT_ID="common"
```

### Prisma

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
```

### Run Development Server

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

---

## 9. Deployment Notes

Recommended deployment:

- **Frontend/backend:** Vercel
- **Database:** Neon PostgreSQL
- **ORM:** Prisma

Before deploying:

1. Add all production environment variables in Vercel.
2. Use the production Neon `DATABASE_URL`.
3. Set `NEXTAUTH_URL` and `AUTH_URL` to the deployed Vercel URL.
4. Run Prisma migration against production DB.
5. Seed demo users only if required for judging.

---

## 10. Cost Optimization

GoalTrack is designed to be cost-efficient for hackathon and early-stage deployment:

- Vercel serverless hosting for the Next.js app.
- Neon serverless PostgreSQL database.
- Prisma ORM for efficient typed queries.
- Role-specific pages reduce unnecessary data fetching.
- Demo credential login avoids dependency on external enterprise SSO during judging.

---

## 11. Project Summary

GoalTrack directly addresses the AtomQuest requirement for a structured, reliable, audit-ready goal setting and tracking portal. It supports the complete lifecycle from employee goal drafting to manager approval, quarterly check-ins, admin reporting, and governance.
