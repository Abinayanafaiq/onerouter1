import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

/**
 * Pengiriman email via SMTP generik (Sumopod, Brevo, dll — cukup ganti env).
 *
 * Env yang dipakai:
 *   SMTP_HOST, SMTP_PORT (default 465), SMTP_SECURE ("true"/"false"),
 *   SMTP_USER, SMTP_PASS, EMAIL_FROM (misal: "9inference <noreply@domain.id>")
 *
 * Kalau SMTP_HOST belum di-set:
 *   - production → email GAGAL dikirim (fail closed, error jelas)
 *   - development → email di-skip, konten di-log ke console (dev convenience,
 *     persis pola Turnstile yang auto-skip tanpa env di dev)
 */

export const MAIL_ENABLED = !!process.env.SMTP_HOST;

let cachedTransporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  if (!host) throw new Error("SMTP_HOST belum dikonfigurasi");

  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === "true"
    : port === 465;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return cachedTransporter;
}

export type SendMailResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; error: string };

export async function sendMail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<SendMailResult> {
  if (!MAIL_ENABLED) {
    if (process.env.NODE_ENV === "production") {
      console.error("[mail] SMTP_HOST tidak di-set di production — email tidak terkirim");
      return { ok: false, error: "Layanan email belum dikonfigurasi" };
    }
    console.log(`[mail:dev] to=${params.to} subject=${params.subject}\n${params.text}`);
    return { ok: true, skipped: true };
  }

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return { ok: true };
  } catch (e) {
    console.error("[mail] sendMail gagal:", e);
    return { ok: false, error: "Gagal mengirim email" };
  }
}
