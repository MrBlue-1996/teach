/**
 * TopShelf Email Package - Comprehensive Test Suite
 *
 * Tests for email service, templates, and provider integrations.
 * SendGrid and SMTP are mocked.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock dependencies before importing module
vi.mock('@topshelf/observability', () => ({
  getLogger: vi.fn(() => ({
    child: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    })),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  })),
}));

// Mock SendGrid - use inline mocks for hoisting
vi.mock('@sendgrid/mail', () => {
  const send = vi.fn();
  const setApiKey = vi.fn();
  return {
    default: {
      setApiKey,
      send,
    },
  };
});

// Mock nodemailer - use inline mocks for hoisting
vi.mock('nodemailer', () => {
  const sendMail = vi.fn();
  const createTransport = vi.fn(() => ({
    sendMail,
  }));
  return {
    default: {
      createTransport,
    },
  };
});

// Import after mocks are set up
import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';

import { EmailService, EmailConfigSchema, EMAIL_TEMPLATES, type EmailConfig } from './index.js';

// Get mock functions from the mocked modules
const mockSgMailSend = vi.mocked(sgMail.send);
const mockSgMailSetApiKey = vi.mocked(sgMail.setApiKey);
const mockCreateTransport = vi.mocked(nodemailer.createTransport);
const getMockSendMail = () => {
  const transporter = mockCreateTransport.mock.results[0]?.value;
  return transporter?.sendMail ? vi.mocked(transporter.sendMail) : vi.fn();
};

// =============================================================================
// TEST FIXTURES
// =============================================================================

const consoleModeConfig: EmailConfig = {
  provider: 'console',
  from: {
    email: 'noreply@topshelfservice.com',
    name: 'TopShelf Teaching',
  },
  replyTo: 'support@topshelfservice.com',
};

const sendgridConfig: EmailConfig = {
  provider: 'sendgrid',
  from: {
    email: 'noreply@topshelfservice.com',
    name: 'TopShelf Teaching',
  },
  sendgrid: {
    apiKey: 'SG.test_api_key',
  },
};

const smtpConfig: EmailConfig = {
  provider: 'smtp',
  from: {
    email: 'noreply@topshelfservice.com',
    name: 'TopShelf Teaching',
  },
  smtp: {
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    auth: {
      user: 'smtp_user',
      pass: 'smtp_pass',
    },
  },
};

// =============================================================================
// EMAIL CONFIG SCHEMA TESTS
// =============================================================================

describe('EmailConfigSchema', () => {
  it('should validate console provider config', () => {
    const result = EmailConfigSchema.safeParse(consoleModeConfig);

    expect(result.success).toBe(true);
  });

  it('should validate SendGrid config', () => {
    const result = EmailConfigSchema.safeParse(sendgridConfig);

    expect(result.success).toBe(true);
  });

  it('should validate SMTP config', () => {
    const result = EmailConfigSchema.safeParse(smtpConfig);

    expect(result.success).toBe(true);
  });

  it('should require provider', () => {
    const config = { ...consoleModeConfig };
    delete (config as any).provider;

    const result = EmailConfigSchema.safeParse(config);

    expect(result.success).toBe(false);
  });

  it('should require valid provider value', () => {
    const config = { ...consoleModeConfig, provider: 'invalid' };

    const result = EmailConfigSchema.safeParse(config);

    expect(result.success).toBe(false);
  });

  it('should require from email', () => {
    const config = { ...consoleModeConfig };
    delete (config as any).from;

    const result = EmailConfigSchema.safeParse(config);

    expect(result.success).toBe(false);
  });

  it('should validate from email format', () => {
    const config = {
      ...consoleModeConfig,
      from: { email: 'invalid-email', name: 'Test' },
    };

    const result = EmailConfigSchema.safeParse(config);

    expect(result.success).toBe(false);
  });

  it('should allow optional replyTo', () => {
    const config = { ...consoleModeConfig };
    delete (config as any).replyTo;

    const result = EmailConfigSchema.safeParse(config);

    expect(result.success).toBe(true);
  });
});

// =============================================================================
// EMAIL TEMPLATES TESTS
// =============================================================================

describe('EMAIL_TEMPLATES', () => {
  it('should define all required template keys', () => {
    expect(EMAIL_TEMPLATES.WELCOME).toBe('welcome');
    expect(EMAIL_TEMPLATES.VERIFY_EMAIL).toBe('verify-email');
    expect(EMAIL_TEMPLATES.PASSWORD_RESET).toBe('password-reset');
    expect(EMAIL_TEMPLATES.PASSWORD_CHANGED).toBe('password-changed');
    expect(EMAIL_TEMPLATES.BADGE_EARNED).toBe('badge-earned');
    expect(EMAIL_TEMPLATES.SUBSCRIPTION_CREATED).toBe('subscription-created');
    expect(EMAIL_TEMPLATES.PAYMENT_FAILED).toBe('payment-failed');
    expect(EMAIL_TEMPLATES.TRIAL_ENDING).toBe('trial-ending');
  });

  it('should have learning related templates', () => {
    expect(EMAIL_TEMPLATES.COURSE_ENROLLED).toBe('course-enrolled');
    expect(EMAIL_TEMPLATES.WEEKLY_PROGRESS).toBe('weekly-progress');
    expect(EMAIL_TEMPLATES.INACTIVITY_REMINDER).toBe('inactivity-reminder');
  });

  it('should have billing related templates', () => {
    expect(EMAIL_TEMPLATES.SUBSCRIPTION_RENEWED).toBe('subscription-renewed');
    expect(EMAIL_TEMPLATES.SUBSCRIPTION_CANCELED).toBe('subscription-canceled');
    expect(EMAIL_TEMPLATES.PAYMENT_SUCCEEDED).toBe('payment-succeeded');
    expect(EMAIL_TEMPLATES.INVOICE_CREATED).toBe('invoice-created');
  });

  it('should have admin related templates', () => {
    expect(EMAIL_TEMPLATES.USER_INVITED).toBe('user-invited');
    expect(EMAIL_TEMPLATES.SEAT_ASSIGNED).toBe('seat-assigned');
    expect(EMAIL_TEMPLATES.REPORT_READY).toBe('report-ready');
  });
});

// =============================================================================
// EMAIL SERVICE TESTS
// =============================================================================

describe('EmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSgMailSend.mockReset();
    getMockSendMail().mockReset();
  });

  // ===========================================================================
  // CONSOLE PROVIDER TESTS
  // ===========================================================================

  describe('Console Provider', () => {
    let emailService: EmailService;

    beforeEach(() => {
      emailService = new EmailService(consoleModeConfig);
    });

    it('should send email to console', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await emailService.send({
        to: { email: 'user@example.com', name: 'Test User' },
        subject: 'Test Email',
        text: 'This is a test email',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^console-/);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle multiple recipients', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await emailService.send({
        to: [
          { email: 'user1@example.com', name: 'User 1' },
          { email: 'user2@example.com', name: 'User 2' },
        ],
        subject: 'Test Email',
        text: 'This is a test email',
      });

      expect(result.success).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  // ===========================================================================
  // SENDGRID PROVIDER TESTS
  // ===========================================================================

  describe('SendGrid Provider', () => {
    let emailService: EmailService;

    beforeEach(() => {
      emailService = new EmailService(sendgridConfig);
    });

    it('should initialize SendGrid with API key', () => {
      expect(mockSgMailSetApiKey).toHaveBeenCalledWith('SG.test_api_key');
    });

    it('should send email via SendGrid', async () => {
      mockSgMailSend.mockResolvedValue([
        {
          statusCode: 202,
          headers: { 'x-message-id': 'sg-msg-123' },
          body: {},
        },
        {},
      ]);

      const result = await emailService.send({
        to: { email: 'user@example.com', name: 'Test User' },
        subject: 'Test Subject',
        html: '<p>Test content</p>',
        text: 'Test content',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('sg-msg-123');
      expect(mockSgMailSend).toHaveBeenCalledWith({
        to: [{ email: 'user@example.com', name: 'Test User' }],
        from: sendgridConfig.from,
        subject: 'Test Subject',
        html: '<p>Test content</p>',
        text: 'Test content',
        replyTo: undefined,
      });
    });

    it('should include replyTo in SendGrid message', async () => {
      const configWithReplyTo = {
        ...sendgridConfig,
        replyTo: 'reply@example.com',
      };
      const service = new EmailService(configWithReplyTo);

      mockSgMailSend.mockResolvedValue([{ statusCode: 202, headers: {}, body: {} }, {}]);

      await service.send({
        to: { email: 'user@example.com' },
        subject: 'Test',
        text: 'Test',
      });

      expect(mockSgMailSend).toHaveBeenCalledWith(
        expect.objectContaining({
          replyTo: 'reply@example.com',
        })
      );
    });

    it('should handle SendGrid error', async () => {
      mockSgMailSend.mockRejectedValueOnce(new Error('SendGrid API error'));

      const result = await emailService.send({
        to: { email: 'user@example.com' },
        subject: 'Test',
        text: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('SendGrid API error');
    });

    it('should handle multiple recipients', async () => {
      mockSgMailSend.mockResolvedValue([{ statusCode: 202, headers: {}, body: {} }, {}]);

      await emailService.send({
        to: [
          { email: 'user1@example.com', name: 'User 1' },
          { email: 'user2@example.com', name: 'User 2' },
        ],
        subject: 'Bulk Email',
        text: 'Test',
      });

      expect(mockSgMailSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: [
            { email: 'user1@example.com', name: 'User 1' },
            { email: 'user2@example.com', name: 'User 2' },
          ],
        })
      );
    });
  });

  // ===========================================================================
  // SMTP PROVIDER TESTS
  // ===========================================================================

  describe('SMTP Provider', () => {
    let emailService: EmailService;

    beforeEach(() => {
      emailService = new EmailService(smtpConfig);
    });

    it('should create nodemailer transporter', () => {
      expect(mockCreateTransport).toHaveBeenCalledWith(smtpConfig.smtp);
    });

    it('should send email via SMTP', async () => {
      getMockSendMail().mockResolvedValue({
        messageId: 'smtp-msg-456',
      });

      const result = await emailService.send({
        to: { email: 'user@example.com', name: 'Test User' },
        subject: 'SMTP Test',
        html: '<p>Content</p>',
        text: 'Content',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('smtp-msg-456');
      expect(getMockSendMail()).toHaveBeenCalledWith({
        from: '"TopShelf Teaching" <noreply@topshelfservice.com>',
        to: '"Test User" <user@example.com>',
        subject: 'SMTP Test',
        html: '<p>Content</p>',
        text: 'Content',
        replyTo: undefined,
      });
    });

    it('should format recipient without name', async () => {
      getMockSendMail().mockResolvedValue({ messageId: 'smtp-msg-789' });

      await emailService.send({
        to: { email: 'noname@example.com' },
        subject: 'Test',
        text: 'Test',
      });

      expect(getMockSendMail()).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'noname@example.com',
        })
      );
    });

    it('should handle SMTP error', async () => {
      getMockSendMail().mockRejectedValueOnce(new Error('SMTP connection failed'));

      const result = await emailService.send({
        to: { email: 'user@example.com' },
        subject: 'Test',
        text: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('SMTP connection failed');
    });

    it('should handle multiple recipients', async () => {
      getMockSendMail().mockResolvedValue({ messageId: 'smtp-multi' });

      await emailService.send({
        to: [{ email: 'user1@example.com', name: 'User 1' }, { email: 'user2@example.com' }],
        subject: 'Multi',
        text: 'Test',
      });

      expect(getMockSendMail()).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '"User 1" <user1@example.com>, user2@example.com',
        })
      );
    });
  });

  // ===========================================================================
  // UNKNOWN PROVIDER TESTS
  // ===========================================================================

  describe('Unknown Provider', () => {
    it('should fail for unknown provider', async () => {
      const config = {
        ...consoleModeConfig,
        provider: 'unknown' as any,
      };

      // This will fail validation, so we need to bypass
      const service = new EmailService(config);

      const result = await service.send({
        to: { email: 'test@example.com' },
        subject: 'Test',
        text: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown email provider');
    });
  });

  // ===========================================================================
  // SEND TEMPLATE TESTS
  // ===========================================================================

  describe('sendTemplate', () => {
    let emailService: EmailService;
    let consoleSpy: any;

    beforeEach(() => {
      emailService = new EmailService(consoleModeConfig);
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should send welcome email template', async () => {
      const result = await emailService.sendTemplate(
        EMAIL_TEMPLATES.WELCOME,
        { email: 'newuser@example.com', name: 'New User' },
        { firstName: 'New' }
      );

      expect(result.success).toBe(true);
    });

    it('should send verify email template', async () => {
      const result = await emailService.sendTemplate(
        EMAIL_TEMPLATES.VERIFY_EMAIL,
        { email: 'user@example.com' },
        {
          firstName: 'Test',
          verifyUrl: 'https://app.example.com/verify/abc123',
        }
      );

      expect(result.success).toBe(true);
    });

    it('should send password reset template', async () => {
      const result = await emailService.sendTemplate(
        EMAIL_TEMPLATES.PASSWORD_RESET,
        { email: 'user@example.com' },
        {
          firstName: 'User',
          resetUrl: 'https://app.example.com/reset/xyz789',
        }
      );

      expect(result.success).toBe(true);
    });

    it('should send badge earned template', async () => {
      const result = await emailService.sendTemplate(
        EMAIL_TEMPLATES.BADGE_EARNED,
        { email: 'learner@example.com', name: 'Star Learner' },
        {
          badgeName: 'Algebra Master',
          badgeDescription: 'Completed all algebra modules',
          badgeId: 'badge-123',
          masteryScore: 95,
        }
      );

      expect(result.success).toBe(true);
    });

    it('should send subscription created template', async () => {
      const result = await emailService.sendTemplate(
        EMAIL_TEMPLATES.SUBSCRIPTION_CREATED,
        { email: 'admin@school.edu' },
        {
          firstName: 'Admin',
          planName: 'School',
          interval: 'annual',
          amount: 4990,
        }
      );

      expect(result.success).toBe(true);
    });

    it('should send payment failed template', async () => {
      const result = await emailService.sendTemplate(
        EMAIL_TEMPLATES.PAYMENT_FAILED,
        { email: 'billing@example.com' },
        {
          firstName: 'Billing',
          amount: 499,
        }
      );

      expect(result.success).toBe(true);
    });

    it('should send trial ending template', async () => {
      const result = await emailService.sendTemplate(
        EMAIL_TEMPLATES.TRIAL_ENDING,
        { email: 'trialuser@example.com' },
        {
          firstName: 'Trial',
          daysRemaining: 3,
        }
      );

      expect(result.success).toBe(true);
    });

    it('should send to multiple recipients', async () => {
      const result = await emailService.sendTemplate(
        EMAIL_TEMPLATES.WELCOME,
        [
          { email: 'user1@example.com', name: 'User 1' },
          { email: 'user2@example.com', name: 'User 2' },
        ],
        { firstName: 'Users' }
      );

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // ERROR HANDLING TESTS
  // ===========================================================================

  describe('Error Handling', () => {
    it('should return error result on exception', async () => {
      const emailService = new EmailService(sendgridConfig);
      mockSgMailSend.mockRejectedValueOnce(new Error('API Error'));

      const result = await emailService.send({
        to: { email: 'user@example.com' },
        subject: 'Test',
        text: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle non-Error exceptions', async () => {
      const emailService = new EmailService(sendgridConfig);
      mockSgMailSend.mockRejectedValueOnce('String error');

      const result = await emailService.send({
        to: { email: 'user@example.com' },
        subject: 'Test',
        text: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });
  });

  // ===========================================================================
  // SMTP TRANSPORTER NOT CONFIGURED
  // ===========================================================================

  describe('SMTP without transporter', () => {
    it('should throw when SMTP transporter not configured', async () => {
      // Create SMTP config without actually initializing transporter
      const incompleteSmtpConfig: EmailConfig = {
        provider: 'smtp',
        from: {
          email: 'test@example.com',
          name: 'Test',
        },
        // Missing smtp config
      };

      const service = new EmailService(incompleteSmtpConfig);

      const result = await service.send({
        to: { email: 'user@example.com' },
        subject: 'Test',
        text: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('SMTP transporter not configured');
    });
  });
});

// =============================================================================
// INTEGRATION PATTERNS
// =============================================================================

describe('Integration Patterns', () => {
  it('should support email with all optional fields', async () => {
    const emailService = new EmailService(consoleModeConfig);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await emailService.send({
      to: { email: 'main@example.com', name: 'Main Recipient' },
      subject: 'Full Featured Email',
      html: '<p>HTML content</p>',
      text: 'Text content',
      replyTo: 'reply@example.com',
      cc: [{ email: 'cc@example.com', name: 'CC User' }],
      bcc: [{ email: 'bcc@example.com' }],
      tags: ['important', 'notification'],
    });

    expect(result.success).toBe(true);

    consoleSpy.mockRestore();
  });
});
