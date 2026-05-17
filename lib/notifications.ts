import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = process.env.RESEND_FROM || "GoalTrack <onboarding@resend.dev>"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

// ─── Types ────────────────────────────────────────────────────────────────────
export type NotificationEvent =
  | "goal_submitted"
  | "goal_approved"
  | "goal_returned"
  | "checkin_reminder"
  | "escalation"

interface NotifyPayload {
  event: NotificationEvent
  toEmail: string
  toName: string
  employeeName?: string
  managerName?: string
  goalCount?: number
  reason?: string
  quarter?: string
  deepLink?: string
}

// ─── Master Notify function ───────────────────────────────────────────────────
// Fires email + Teams in parallel. Never throws — notification failure
// must never block the main flow.
export async function notify(payload: NotifyPayload): Promise<void> {
  try {
    await Promise.allSettled([
      sendEmail(payload),
      sendTeamsCard(payload),
    ])
  } catch {
    // Silent — notifications are non-critical
  }
}

// ─── Email Templates ──────────────────────────────────────────────────────────
async function sendEmail(p: NotifyPayload): Promise<void> {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "re_your_api_key_here") {
    return // Email not configured — skip silently
  }

  const { subject, html } = buildEmailTemplate(p)

  await resend.emails.send({
    from: FROM,
    to: p.toEmail,
    subject,
    html,
  })
}

function buildEmailTemplate(p: NotifyPayload): { subject: string; html: string } {
  const link = p.deepLink ? `${APP_URL}${p.deepLink}` : APP_URL
  const buttonHtml = `
    <a href="${link}"
       style="display:inline-block;background:#0f172a;color:#fff;
              padding:10px 24px;border-radius:6px;text-decoration:none;
              font-size:14px;font-weight:500;margin-top:16px;">
      Open GoalTrack →
    </a>
  `
  const wrapper = (title: string, body: string) => `
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;
                padding:32px 24px;color:#1e293b;">
      <div style="margin-bottom:24px;">
        <span style="font-size:18px;font-weight:600;">GoalTrack</span>
      </div>
      <h2 style="font-size:16px;font-weight:600;margin:0 0 12px;">${title}</h2>
      <div style="font-size:14px;line-height:1.7;color:#475569;">${body}</div>
      ${buttonHtml}
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;
                  font-size:12px;color:#94a3b8;">
        This is an automated message from GoalTrack. Do not reply.
      </div>
    </div>
  `

  switch (p.event) {
    case "goal_submitted":
      return {
        subject: `Action Required — ${p.employeeName} submitted goals for review`,
        html: wrapper(
          "Goals Submitted for Your Approval",
          `<p>Hi ${p.toName},</p>
           <p><strong>${p.employeeName}</strong> has submitted 
           <strong>${p.goalCount} goal${(p.goalCount || 0) > 1 ? "s" : ""}</strong>
           for your review and approval.</p>
           <p>Please log in to GoalTrack to review, edit if needed, and approve or return the goals.</p>`
        ),
      }

    case "goal_approved":
      return {
        subject: "Your Goals Have Been Approved",
        html: wrapper(
          "Goals Approved ✓",
          `<p>Hi ${p.toName},</p>
           <p>Great news! Your manager <strong>${p.managerName}</strong> has approved
           your goals for this cycle.</p>
           <p>Your goals are now locked. You can begin logging quarterly check-ins
           once the Q1 window opens in July.</p>`
        ),
      }

    case "goal_returned":
      return {
        subject: "Your Goals Have Been Returned for Revision",
        html: wrapper(
          "Goals Returned for Revision",
          `<p>Hi ${p.toName},</p>
           <p>Your manager <strong>${p.managerName}</strong> has returned your goals
           with feedback.</p>
           ${p.reason ? `<p><strong>Reason:</strong> ${p.reason}</p>` : ""}
           <p>Please log in to GoalTrack to revise and resubmit your goals.</p>`
        ),
      }

    case "checkin_reminder":
      return {
        subject: `Reminder — ${p.quarter} Check-in Due`,
        html: wrapper(
          `${p.quarter} Check-in Reminder`,
          `<p>Hi ${p.toName},</p>
           <p>This is a reminder to complete your <strong>${p.quarter}</strong>
           check-in on GoalTrack.</p>
           <p>Log your actual achievements against your planned targets so your
           manager can review your progress.</p>`
        ),
      }

    case "escalation":
      return {
        subject: `Action Required — Escalation Alert`,
        html: wrapper(
          "Escalation Alert",
          `<p>Hi ${p.toName},</p>
           <p>${p.reason}</p>
           <p>Please log in to GoalTrack to take the required action.</p>`
        ),
      }

    default:
      return { subject: "GoalTrack Notification", html: wrapper("Notification", "") }
  }
}

// ─── Teams Adaptive Card ──────────────────────────────────────────────────────
async function sendTeamsCard(p: NotifyPayload): Promise<void> {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL
  if (!webhookUrl || webhookUrl.trim() === "") return

  const card = buildTeamsCard(p)

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(card),
  })
}

function buildTeamsCard(p: NotifyPayload) {
  const link = p.deepLink ? `${APP_URL}${p.deepLink}` : APP_URL

  const titleMap: Record<NotificationEvent, string> = {
    goal_submitted:   "📋 Goals Submitted for Approval",
    goal_approved:    "✅ Goals Approved",
    goal_returned:    "↩️ Goals Returned for Revision",
    checkin_reminder: "⏰ Check-in Reminder",
    escalation:       "⚠️ Escalation Alert",
  }

  const bodyMap: Record<NotificationEvent, string> = {
    goal_submitted:   `${p.employeeName} has submitted ${p.goalCount} goal(s) for your review.`,
    goal_approved:    `Your goals have been approved by ${p.managerName}.`,
    goal_returned:    `Your goals were returned by ${p.managerName}. ${p.reason ? `Reason: ${p.reason}` : ""}`,
    checkin_reminder: `Your ${p.quarter} check-in is due. Please update your progress on GoalTrack.`,
    escalation:       p.reason || "An escalation has been triggered.",
  }

  // Microsoft Teams Incoming Webhook payload (MessageCard format — works without app registration)
  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor: p.event === "goal_approved" ? "10b981"
               : p.event === "goal_returned" ? "ef4444"
               : p.event === "escalation"    ? "f59e0b"
               : "6366f1",
    summary: titleMap[p.event],
    sections: [
      {
        activityTitle: `**${titleMap[p.event]}**`,
        activitySubtitle: `GoalTrack · ${new Date().toLocaleString("en-IN")}`,
        activityText: bodyMap[p.event],
        facts: [
          ...(p.employeeName ? [{ name: "Employee", value: p.employeeName }] : []),
          ...(p.managerName  ? [{ name: "Manager",  value: p.managerName  }] : []),
          ...(p.quarter      ? [{ name: "Quarter",  value: p.quarter      }] : []),
        ],
      },
    ],
    potentialAction: [
      {
        "@type": "OpenUri",
        name: "Open GoalTrack",
        targets: [{ os: "default", uri: link }],
      },
    ],
  }
}