/**
 * TopShelf Service LLC - Transactional Email Service
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { getLogger } from '@topshelf/observability';

// =============================================================================
// CONFIGURATION
// =============================================================================

const EmailConfigSchema = z.object({
  provider: z.enum(['sendgrid', 'smtp', 'console']),
  from: z.object({
    email: z.string().email(),
    name: z.string(),
  }),
  replyTo: z.string().email().optional(),
  sendgrid: z
    .object({
      apiKey: z.string(),
    })
    .optional(),
  smtp: z
    .object({
      host: z.string(),
      port: z.number(),
      secure: z.boolean(),
      auth: z.object({
        user: z.string(),
        pass: z.string(),
      }),
    })
    .optional(),
  templateIds: z.record(z.string()).optional(),
});

export type EmailConfig = z.infer<typeof EmailConfigSchema>;

// =============================================================================
// TYPES
// =============================================================================

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface SendEmailParams {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
  attachments?: EmailAttachment[];
  replyTo?: string;
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  tags?: string[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

export const EMAIL_TEMPLATES = {
  // Authentication
  WELCOME: 'welcome',
  VERIFY_EMAIL: 'verify-email',
  PASSWORD_RESET: 'password-reset',
  PASSWORD_CHANGED: 'password-changed',

  // Learning
  COURSE_ENROLLED: 'course-enrolled',
  BADGE_EARNED: 'badge-earned',
  WEEKLY_PROGRESS: 'weekly-progress',
  INACTIVITY_REMINDER: 'inactivity-reminder',

  // Billing
  SUBSCRIPTION_CREATED: 'subscription-created',
  SUBSCRIPTION_RENEWED: 'subscription-renewed',
  SUBSCRIPTION_CANCELED: 'subscription-canceled',
  PAYMENT_FAILED: 'payment-failed',
  PAYMENT_SUCCEEDED: 'payment-succeeded',
  INVOICE_CREATED: 'invoice-created',
  TRIAL_ENDING: 'trial-ending',

  // Admin
  USER_INVITED: 'user-invited',
  SEAT_ASSIGNED: 'seat-assigned',
  REPORT_READY: 'report-ready',
} as const;

export type EmailTemplate = (typeof EMAIL_TEMPLATES)[keyof typeof EMAIL_TEMPLATES];

// =============================================================================
// TEMPLATE RENDERER
// =============================================================================

interface TemplateContext {
  appName: string;
  appUrl: string;
  supportEmail: string;
  currentYear: number;
  unsubscribeUrl?: string;
}

function getBaseContext(): TemplateContext {
  return {
    appName: 'TopShelf Teaching',
    appUrl: process.env.APP_URL || 'https://app.topshelfteaching.com',
    supportEmail: 'support@topshelfservice.com',
    currentYear: new Date().getFullYear(),
  };
}

function renderTemplate(
  template: EmailTemplate,
  data: Record<string, unknown>
): { subject: string; html: string; text: string } {
  const ctx = { ...getBaseContext(), ...data };

  // Template definitions
  const templates: Record<EmailTemplate, { subject: string; html: string; text: string }> = {
    [EMAIL_TEMPLATES.WELCOME]: {
      subject: `Welcome to ${ctx.appName}!`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2563eb;">Welcome to ${ctx.appName}!</h1>
  </div>
  <p>Hi ${data.firstName || 'there'},</p>
  <p>Thank you for joining ${ctx.appName}. We're excited to help you on your learning journey!</p>
  <p>Get started by exploring our content packs and setting your learning goals.</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="${ctx.appUrl}/dashboard" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Dashboard</a>
  </div>
  <p>If you have any questions, reach out to us at ${ctx.supportEmail}.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #6b7280; font-size: 12px;">&copy; ${ctx.currentYear} TopShelf Service LLC. All rights reserved.</p>
</body>
</html>`,
      text: `Welcome to ${ctx.appName}!\n\nHi ${data.firstName || 'there'},\n\nThank you for joining. Get started at ${ctx.appUrl}/dashboard\n\nQuestions? Email ${ctx.supportEmail}`,
    },

    [EMAIL_TEMPLATES.VERIFY_EMAIL]: {
      subject: `Verify your email for ${ctx.appName}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Verify Your Email Address</h2>
  <p>Hi ${data.firstName || 'there'},</p>
  <p>Please click the button below to verify your email address:</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="${data.verifyUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a>
  </div>
  <p style="color: #6b7280; font-size: 14px;">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #6b7280; font-size: 12px;">&copy; ${ctx.currentYear} TopShelf Service LLC</p>
</body>
</html>`,
      text: `Verify your email at: ${data.verifyUrl}\n\nThis link expires in 24 hours.`,
    },

    [EMAIL_TEMPLATES.PASSWORD_RESET]: {
      subject: `Reset your ${ctx.appName} password`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Reset Your Password</h2>
  <p>Hi ${data.firstName || 'there'},</p>
  <p>We received a request to reset your password. Click the button below to create a new password:</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="${data.resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
  </div>
  <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you didn't request a password reset, you can ignore this email.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #6b7280; font-size: 12px;">&copy; ${ctx.currentYear} TopShelf Service LLC</p>
</body>
</html>`,
      text: `Reset your password at: ${data.resetUrl}\n\nThis link expires in 1 hour.`,
    },

    [EMAIL_TEMPLATES.PASSWORD_CHANGED]: {
      subject: `Your ${ctx.appName} password was changed`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Password Changed</h2>
  <p>Hi ${data.firstName || 'there'},</p>
  <p>Your password was successfully changed on ${new Date().toLocaleDateString()}.</p>
  <p>If you didn't make this change, please contact us immediately at ${ctx.supportEmail}.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #6b7280; font-size: 12px;">&copy; ${ctx.currentYear} TopShelf Service LLC</p>
</body>
</html>`,
      text: `Your password was changed on ${new Date().toLocaleDateString()}. If you didn't make this change, contact ${ctx.supportEmail}.`,
    },

    [EMAIL_TEMPLATES.BADGE_EARNED]: {
      subject: `Congratulations! You earned a new badge 🎉`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center;">
    <h1 style="color: #2563eb;">🎉 Congratulations!</h1>
    <p style="font-size: 18px;">You earned the <strong>${data.badgeName}</strong> badge!</p>
    <div style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); border-radius: 12px; padding: 30px; margin: 20px 0; color: white;">
      <h2 style="margin: 0 0 10px 0;">${data.badgeName}</h2>
      <p style="margin: 0; opacity: 0.9;">${data.badgeDescription}</p>
    </div>
    <p>Mastery Score: <strong>${data.masteryScore}%</strong></p>
    <a href="${ctx.appUrl}/badges/${data.badgeId}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px;">View Your Badge</a>
  </div>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #6b7280; font-size: 12px; text-align: center;">&copy; ${ctx.currentYear} TopShelf Service LLC</p>
</body>
</html>`,
      text: `Congratulations! You earned the ${data.badgeName} badge with a mastery score of ${data.masteryScore}%. View it at ${ctx.appUrl}/badges/${data.badgeId}`,
    },

    [EMAIL_TEMPLATES.SUBSCRIPTION_CREATED]: {
      subject: `Your ${ctx.appName} subscription is active`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Welcome to ${data.planName}!</h2>
  <p>Hi ${data.firstName || 'there'},</p>
  <p>Your subscription to the <strong>${data.planName}</strong> plan is now active.</p>
  <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <p style="margin: 0;"><strong>Plan:</strong> ${data.planName}</p>
    <p style="margin: 10px 0 0 0;"><strong>Billing:</strong> ${data.interval}</p>
    <p style="margin: 10px 0 0 0;"><strong>Amount:</strong> $${data.amount}/${data.interval === 'annual' ? 'year' : 'month'}</p>
  </div>
  <p>Manage your subscription at any time in your <a href="${ctx.appUrl}/settings/billing">billing settings</a>.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #6b7280; font-size: 12px;">&copy; ${ctx.currentYear} TopShelf Service LLC</p>
</body>
</html>`,
      text: `Your ${data.planName} subscription is active. Amount: $${data.amount}/${data.interval === 'annual' ? 'year' : 'month'}`,
    },

    [EMAIL_TEMPLATES.PAYMENT_FAILED]: {
      subject: `Action required: Payment failed for ${ctx.appName}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #dc2626;">Payment Failed</h2>
  <p>Hi ${data.firstName || 'there'},</p>
  <p>We were unable to process your payment of <strong>$${data.amount}</strong> for your ${ctx.appName} subscription.</p>
  <p>Please update your payment method to avoid service interruption.</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="${ctx.appUrl}/settings/billing" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Update Payment Method</a>
  </div>
  <p style="color: #6b7280;">If you have questions, contact ${ctx.supportEmail}.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #6b7280; font-size: 12px;">&copy; ${ctx.currentYear} TopShelf Service LLC</p>
</body>
</html>`,
      text: `Payment of $${data.amount} failed. Update your payment method at ${ctx.appUrl}/settings/billing`,
    },

    [EMAIL_TEMPLATES.TRIAL_ENDING]: {
      subject: `Your ${ctx.appName} trial ends in ${data.daysRemaining} days`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Your Trial is Ending Soon</h2>
  <p>Hi ${data.firstName || 'there'},</p>
  <p>Your free trial of ${ctx.appName} ends in <strong>${data.daysRemaining} days</strong>.</p>
  <p>To continue learning without interruption, add a payment method to your account.</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="${ctx.appUrl}/settings/billing" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Continue Subscription</a>
  </div>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #6b7280; font-size: 12px;">&copy; ${ctx.currentYear} TopShelf Service LLC</p>
</body>
</html>`,
      text: `Your trial ends in ${data.daysRemaining} days. Continue at ${ctx.appUrl}/settings/billing`,
    },

    // Stub templates for remaining types
    [EMAIL_TEMPLATES.COURSE_ENROLLED]: { subject: "You're enrolled!", html: '', text: '' },
    [EMAIL_TEMPLATES.WEEKLY_PROGRESS]: { subject: 'Your weekly progress', html: '', text: '' },
    [EMAIL_TEMPLATES.INACTIVITY_REMINDER]: { subject: 'We miss you!', html: '', text: '' },
    [EMAIL_TEMPLATES.SUBSCRIPTION_RENEWED]: { subject: 'Subscription renewed', html: '', text: '' },
    [EMAIL_TEMPLATES.SUBSCRIPTION_CANCELED]: {
      subject: 'Subscription canceled',
      html: '',
      text: '',
    },
    [EMAIL_TEMPLATES.PAYMENT_SUCCEEDED]: { subject: 'Payment received', html: '', text: '' },
    [EMAIL_TEMPLATES.INVOICE_CREATED]: { subject: 'New invoice', html: '', text: '' },
    [EMAIL_TEMPLATES.USER_INVITED]: { subject: "You've been invited", html: '', text: '' },
    [EMAIL_TEMPLATES.SEAT_ASSIGNED]: { subject: 'Seat assigned', html: '', text: '' },
    [EMAIL_TEMPLATES.REPORT_READY]: { subject: 'Report ready', html: '', text: '' },
  };

  return templates[template] || { subject: '', html: '', text: '' };
}

// =============================================================================
// EMAIL SERVICE
// =============================================================================

export class EmailService {
  private config: EmailConfig;
  private logger = getLogger().child({ service: 'email' });
  private transporter?: nodemailer.Transporter;

  constructor(config: EmailConfig) {
    this.config = config;

    if (config.provider === 'sendgrid' && config.sendgrid) {
      sgMail.setApiKey(config.sendgrid.apiKey);
    } else if (config.provider === 'smtp' && config.smtp) {
      this.transporter = nodemailer.createTransport(config.smtp);
    }
  }

  async send(params: SendEmailParams): Promise<EmailResult> {
    this.logger.info(
      { to: Array.isArray(params.to) ? params.to.length : 1, subject: params.subject },
      'Sending email'
    );

    try {
      if (this.config.provider === 'console') {
        return await this.sendToConsole(params);
      } else if (this.config.provider === 'sendgrid') {
        return await this.sendViaSendGrid(params);
      } else if (this.config.provider === 'smtp') {
        return await this.sendViaSMTP(params);
      }

      throw new Error(`Unknown email provider: ${this.config.provider}`);
    } catch (error) {
      this.logger.error({ error, to: params.to }, 'Failed to send email');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendTemplate(
    template: EmailTemplate,
    to: EmailRecipient | EmailRecipient[],
    data: Record<string, unknown>
  ): Promise<EmailResult> {
    const rendered = renderTemplate(template, data);

    return this.send({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  private async sendToConsole(params: SendEmailParams): Promise<EmailResult> {
    const recipients = Array.isArray(params.to) ? params.to : [params.to];
    console.log('\n========== EMAIL ==========');
    console.log(`To: ${recipients.map((r) => r.email).join(', ')}`);
    console.log(`Subject: ${params.subject}`);
    console.log('---------------------------');
    console.log(params.text || 'No text content');
    console.log('===========================\n');

    return { success: true, messageId: `console-${Date.now()}` };
  }

  private async sendViaSendGrid(params: SendEmailParams): Promise<EmailResult> {
    const recipients = Array.isArray(params.to) ? params.to : [params.to];
    const replyTo = params.replyTo ?? this.config.replyTo;

    const msg = {
      to: recipients.map((r) => ({ email: r.email, ...(r.name ? { name: r.name } : {}) })),
      from: this.config.from,
      subject: params.subject,
      ...(params.html ? { html: params.html } : {}),
      ...(params.text ? { text: params.text } : {}),
      ...(replyTo ? { replyTo } : {}),
    } as sgMail.MailDataRequired;

    const [response] = await sgMail.send(msg);
    return {
      success: response.statusCode >= 200 && response.statusCode < 300,
      messageId: response.headers['x-message-id'] as string,
    };
  }

  private async sendViaSMTP(params: SendEmailParams): Promise<EmailResult> {
    if (!this.transporter) {
      throw new Error('SMTP transporter not configured');
    }

    const recipients = Array.isArray(params.to) ? params.to : [params.to];

    const info = await this.transporter.sendMail({
      from: `"${this.config.from.name}" <${this.config.from.email}>`,
      to: recipients.map((r) => (r.name ? `"${r.name}" <${r.email}>` : r.email)).join(', '),
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo || this.config.replyTo,
    });

    return { success: true, messageId: info.messageId };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { EmailConfigSchema };
