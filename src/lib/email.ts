/**
 * Email sending utilities — SMTP transport (Mailpit for local dev).
 *
 * Transport selection (priority order):
 *  1. SMTP      — when SMTP_HOST is set (Mailpit: docker run axllent/mailpit)
 *  2. Console   — fallback when SMTP is not configured ([EMAIL DEV])
 */

export const EMAIL_FROM = process.env.EMAIL_FROM ?? 'CityOps <noreply@cityops.dev>';

import { smtpTransporter } from '@/lib/nodemailer';
import { prisma } from '@/lib/prisma';
import { verificationEmailHtml } from '@/lib/email-templates/verification';
import { passwordResetEmailHtml } from '@/lib/email-templates/password-reset';
import { statusChangeEmailHtml } from '@/lib/email-templates/status-change';
import { reportSubmissionEmailHtml } from '@/lib/email-templates/report-submission';
import { commentNotificationEmailHtml } from '@/lib/email-templates/comment-notification';
import { assignmentNotificationEmailHtml } from '@/lib/email-templates/assignment-notification';

/* ------------------------------------------------------------------ */
/*  Core send function                                                */
/* ------------------------------------------------------------------ */

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  tenantId?: string;
  userId?: string;
  referenceType?: string;
  referenceId?: string;
}

interface SendEmailResult {
  success: boolean;
  error?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, html, tenantId, userId, referenceType, referenceId } = options;

  /* Console fallback — no SMTP configured */
  if (!smtpTransporter) {
    console.log(`[EMAIL DEV] To: ${to} | Subject: ${subject}`);
    return { success: true };
  }

  /* Send via SMTP (Mailpit) */
  try {
    await smtpTransporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });

    /* Track delivery */
    if (tenantId && userId) {
      try {
        await prisma.notification.create({
          data: {
            tenantId,
            userId,
            channel: 'email',
            status: 'sent',
            subject,
            body: html,
            referenceType: referenceType ?? null,
            referenceId: referenceId ?? null,
            sentAt: new Date(),
          },
        });
      } catch {
        /* Notification record failure must not break the flow */
      }
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown email send error';
    console.error(`[EMAIL ERROR] Transport: SMTP | To: ${to} | ${message}`);

    /* Track failure */
    if (tenantId && userId) {
      try {
        await prisma.notification.create({
          data: {
            tenantId,
            userId,
            channel: 'email',
            status: 'failed',
            subject,
            body: html,
            referenceType: referenceType ?? null,
            referenceId: referenceId ?? null,
            failedReason: message,
          },
        });
      } catch {
        /* Notification record failure must not break the flow */
      }
    }

    return { success: false, error: message };
  }
}

/* ------------------------------------------------------------------ */
/*  Pre-built email senders (callers unchanged)                       */
/* ------------------------------------------------------------------ */

const baseUrl = () => process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

/**
 * Sends an account verification email to the given address.
 */
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const verificationUrl = `${baseUrl()}/verify-email?token=${token}`;
  const html = verificationEmailHtml({ verificationUrl });

  await sendEmail({
    to: email,
    subject: 'Verify your email — CityOps',
    html,
  });
}

/**
 * Sends a password reset email to the given address.
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${baseUrl()}/reset-password?token=${token}`;
  const html = passwordResetEmailHtml({ resetUrl });

  await sendEmail({
    to: email,
    subject: 'Reset your password — CityOps',
    html,
  });
}

/**
 * Sends a status change notification to the report's original reporter.
 */
export interface StatusChangeEmailOptions {
  to: string;
  displayName: string;
  reportId: number;
  reportTitle: string;
  oldStatus: string;
  newStatus: string;
  tenantName: string;
  tenantId: string;
  userId: string;
}

export async function sendStatusChangeEmail(options: StatusChangeEmailOptions): Promise<void> {
  const { to, displayName, reportId, reportTitle, oldStatus, newStatus, tenantName, tenantId, userId } = options;

  const reportUrl = `${baseUrl()}/reports/${reportId}`;
  const html = statusChangeEmailHtml({
    displayName,
    reportTitle,
    oldStatus,
    newStatus,
    tenantName,
    reportUrl,
  });

  await sendEmail({
    to,
    subject: `Your report "${reportTitle}" has been updated`,
    html,
    tenantId,
    userId,
    referenceType: 'report',
    referenceId: String(reportId),
  });
}

/**
 * Sends a submission confirmation email to the citizen who just submitted a report.
 */
export interface ReportSubmissionEmailOptions {
  to: string;
  displayName: string;
  reportId: number;
  reportTitle: string;
  tenantName: string;
  tenantId: string;
  userId: string;
}

export async function sendReportSubmissionEmail(options: ReportSubmissionEmailOptions): Promise<void> {
  const { to, displayName, reportId, reportTitle, tenantName, tenantId, userId } = options;

  const reportUrl = `${baseUrl()}/reports/${reportId}`;
  const html = reportSubmissionEmailHtml({
    displayName,
    reportTitle,
    reportId,
    tenantName,
    reportUrl,
  });

  await sendEmail({
    to,
    subject: `Your report has been received — ${reportTitle}`,
    html,
    tenantId,
    userId,
    referenceType: 'report',
    referenceId: String(reportId),
  });
}

/**
 * Sends a comment notification to the citizen who submitted the report.
 * Must only be called for public (non-internal) comments.
 */
export interface CommentNotificationEmailOptions {
  to: string;
  displayName: string; // reporter's name
  reportId: string;
  reportTitle: string;
  commenterName: string;
  commentBody: string;
  tenantName: string;
  tenantId: string;
  userId: string; // reporter's userId
}

export async function sendCommentNotificationEmail(options: CommentNotificationEmailOptions): Promise<void> {
  const { to, displayName, reportId, reportTitle, commenterName, commentBody, tenantName, tenantId, userId } = options;

  const reportUrl = `${baseUrl()}/reports/${reportId}`;
  const html = commentNotificationEmailHtml({
    displayName,
    reportTitle,
    commenterName,
    commentBody,
    tenantName,
    reportUrl,
  });

  await sendEmail({
    to,
    subject: `New comment on your report "${reportTitle}"`,
    html,
    tenantId,
    userId,
    referenceType: 'report',
    referenceId: reportId,
  });
}

/**
 * Sends an assignment notification to the staff member a report was assigned to.
 * Must only be called when assignedToUserId is non-null.
 */
export interface AssignmentNotificationEmailOptions {
  to: string;
  displayName: string; // assigned staff member's name
  reportId: string;
  reportTitle: string;
  priority: string | null;
  categoryName: string;
  locationText: string | null;
  reporterName: string;
  assignedByName: string; // who assigned the report
  tenantName: string;
  tenantId: string;
  userId: string; // assigned staff member's userId
}

export async function sendAssignmentNotificationEmail(options: AssignmentNotificationEmailOptions): Promise<void> {
  const {
    to,
    displayName,
    reportId,
    reportTitle,
    priority,
    categoryName,
    locationText,
    reporterName,
    assignedByName,
    tenantName,
    tenantId,
    userId,
  } = options;

  const reportUrl = `${baseUrl()}/staff/reports/${reportId}`;
  const html = assignmentNotificationEmailHtml({
    displayName,
    reportTitle,
    priority,
    categoryName,
    locationText,
    reporterName,
    assignedByName,
    tenantName,
    reportUrl,
  });

  await sendEmail({
    to,
    subject: `Report assigned to you: "${reportTitle}"`,
    html,
    tenantId,
    userId,
    referenceType: 'report',
    referenceId: reportId,
  });
}
