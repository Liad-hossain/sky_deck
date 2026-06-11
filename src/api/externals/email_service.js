import nodemailer from 'nodemailer';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SKY_DECK_APP_URL,
} from '../env_variables.js';

function loadTemplate(templateName, replacements = {}) {
  const candidates = [
    resolve(process.cwd(), 'src', 'email_templates', templateName),
    resolve(process.cwd(), 'email_templates', templateName),
    resolve(process.cwd(), '..', '..', 'src', 'email_templates', templateName),
  ];

  const templatePath = candidates.find((p) => existsSync(p));
  if (!templatePath) {
    throw new Error(
      `Invitation email template not found: ${templateName}. Tried: ${candidates.join(', ')}`
    );
  }

  let html = readFileSync(templatePath, 'utf-8');
  for (const [key, value] of Object.entries(replacements)) {
    html = html.replaceAll(`{{${key}}}`, value ?? '');
  }
  return html;
}

function createTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

export async function sendConfirmationEmail({ toEmail, confirmationUrl }) {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn('SMTP not configured — skipping confirmation email send');
    return { success: false, error: 'Email service not configured' };
  }

  const htmlBody = loadTemplate('confirmation.html', {
    CONFIRMATION_URL: confirmationUrl,
  });

  try {
    const info = await transporter.sendMail({
      from: 'Sky Deck',
      to: toEmail,
      subject: 'Verify your Sky Deck email address',
      html: htmlBody,
    });
    return { success: true, messageId: info.messageId ?? null };
  } catch (e) {
    console.error('Error sending confirmation email:', e);
    return { success: false, error: e.message || String(e) };
  }
}

export async function sendInvitationEmail({
  toEmail,
  inviterName,
  platformTitle,
  platformId,
}) {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn('SMTP not configured — skipping email send');
    return { success: false, error: 'Email service not configured' };
  }

  const appUrl = (SKY_DECK_APP_URL || '').replace(/\/$/, '');
  const inviteLink = `${appUrl}/github/${platformId}/accept-invite`;

  const htmlBody = loadTemplate('invitation.html', {
    INVITER_NAME: inviterName || 'A team member',
    PLATFORM_TITLE: platformTitle || 'GitHub',
    INVITE_LINK: inviteLink,
  });

  try {
    const info = await transporter.sendMail({
      from: 'Sky Deck',
      to: toEmail,
      subject: `${inviterName || 'Someone'} invited you to ${platformTitle || 'a platform'} on Sky Deck`,
      html: htmlBody,
    });

    return { success: true, messageId: info.messageId ?? null };
  } catch (e) {
    console.error('Error sending invitation email:', e);
    return { success: false, error: e.message || String(e) };
  }
}
