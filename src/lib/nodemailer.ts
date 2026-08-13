import nodemailer from "nodemailer";

/**
 * Singleton nodemailer SMTP transporter.
 * Returns `null` when SMTP_HOST is not set.
 *
 * Intended for local development with Mailpit:
 *   docker run -d --name mailpit -p 8025:8025 -p 1025:1025 axllent/mailpit
 *   SMTP_HOST=localhost  SMTP_PORT=1025
 */
export const smtpTransporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 1025),
      secure: false,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    })
  : null;
