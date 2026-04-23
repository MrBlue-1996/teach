/**
 * TopShelf Service LLC - Configuration Management System
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Walk up from this file's location (packages/config/src/) to the repo root
// so .env is found regardless of which directory the process starts in.
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
dotenvConfig({ path: resolve(repoRoot, '.env') });

// =============================================================================
// ENVIRONMENT SCHEMA
// =============================================================================

const EnvironmentSchema = z.enum(['development', 'staging', 'production', 'test']);
type Environment = z.infer<typeof EnvironmentSchema>;

// =============================================================================
// DATABASE CONFIGURATION
// =============================================================================

const DatabaseConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.coerce.number().default(5432),
  database: z.string(),
  username: z.string(),
  password: z.string(),
  ssl: z.boolean().default(false),
  poolMin: z.coerce.number().default(2),
  poolMax: z.coerce.number().default(10),
  connectionTimeoutMs: z.coerce.number().default(10000),
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

// =============================================================================
// REDIS CONFIGURATION
// =============================================================================

const RedisConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.coerce.number().default(6379),
  password: z.string().optional(),
  db: z.coerce.number().default(0),
  tls: z.boolean().default(false),
  keyPrefix: z.string().default('topshelf:'),
});

export type RedisConfig = z.infer<typeof RedisConfigSchema>;

// =============================================================================
// EMAIL CONFIGURATION
// =============================================================================

const EmailConfigSchema = z.object({
  provider: z.enum(['sendgrid', 'smtp']).default('smtp'),
  sendgridApiKey: z.string().optional(),
  smtp: z
    .object({
      host: z.string().default('localhost'),
      port: z.coerce.number().default(587),
      user: z.string().optional(),
      pass: z.string().optional(),
    })
    .default({}),
  fromAddress: z.string().default('noreply@topshelf.app'),
});

export type EmailConfig = z.infer<typeof EmailConfigSchema>;

// =============================================================================
// AUTH CONFIGURATION
// =============================================================================

const AuthConfigSchema = z.object({
  jwtSecret: z.string().min(32),
  jwtExpiresIn: z.string().default('15m'),
  refreshTokenExpiresIn: z.string().default('7d'),
  bcryptRounds: z.coerce.number().default(12),
  sessionSecret: z.string().min(32),
  allowedOrigins: z.array(z.string()).default(['http://localhost:3000']),
  oauth: z
    .object({
      google: z
        .object({
          clientId: z.string().optional(),
          clientSecret: z.string().optional(),
          enabled: z.boolean().default(false),
        })
        .default({ enabled: false }),
      microsoft: z
        .object({
          clientId: z.string().optional(),
          clientSecret: z.string().optional(),
          tenantId: z.string().optional(),
          enabled: z.boolean().default(false),
        })
        .default({ enabled: false }),
    })
    .default({
      google: { enabled: false },
      microsoft: { enabled: false },
    }),
});

export type AuthConfig = z.infer<typeof AuthConfigSchema>;

// =============================================================================
// API SERVER CONFIGURATION
// =============================================================================

const ApiServerConfigSchema = z.object({
  host: z.string().default('0.0.0.0'),
  port: z.coerce.number().default(3000),
  basePath: z.string().default('/api/v1'),
  trustProxy: z.boolean().default(false),
  corsEnabled: z.boolean().default(true),
  rateLimitWindowMs: z.coerce.number().default(60000),
  rateLimitMax: z.coerce.number().default(100),
  bodyLimit: z.string().default('10mb'),
});

export type ApiServerConfig = z.infer<typeof ApiServerConfigSchema>;

// =============================================================================
// LLM CONFIGURATION
// =============================================================================

const LLMConfigSchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'local']).default('anthropic'),
  anthropic: z
    .object({
      apiKey: z.string().optional(),
      model: z.string().default('claude-sonnet-4-6'),
      maxTokens: z.coerce.number().default(4096),
    })
    .default({}),
  openai: z
    .object({
      apiKey: z.string().optional(),
      model: z.string().default('gpt-4-turbo'),
      maxTokens: z.coerce.number().default(4096),
    })
    .default({}),
  fallbackToLocal: z.boolean().default(true),
  timeout: z.coerce.number().default(30000),
});

export type LLMConfig = z.infer<typeof LLMConfigSchema>;

// =============================================================================
// STORAGE CONFIGURATION
// =============================================================================

const StorageConfigSchema = z.object({
  provider: z.enum(['local', 's3', 'gcs', 'azure']).default('local'),
  localPath: z.string().default('./storage'),
  s3: z
    .object({
      bucket: z.string().optional(),
      region: z.string().optional(),
      accessKeyId: z.string().optional(),
      secretAccessKey: z.string().optional(),
      endpoint: z.string().optional(),
    })
    .default({}),
  contentPackPath: z.string().default('./content-packs'),
  maxUploadSize: z.coerce.number().default(50 * 1024 * 1024), // 50MB
});

export type StorageConfig = z.infer<typeof StorageConfigSchema>;

// =============================================================================
// OBSERVABILITY CONFIGURATION
// =============================================================================

const ObservabilityConfigSchema = z.object({
  logging: z
    .object({
      level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
      format: z.enum(['json', 'pretty']).default('json'),
      includeTimestamp: z.boolean().default(true),
      redactPII: z.boolean().default(true),
    })
    .default({}),
  metrics: z
    .object({
      enabled: z.boolean().default(true),
      port: z.coerce.number().default(9090),
      path: z.string().default('/metrics'),
    })
    .default({}),
  tracing: z
    .object({
      enabled: z.boolean().default(false),
      serviceName: z.string().default('topshelf-teaching'),
      endpoint: z.string().optional(),
      sampleRate: z.coerce.number().min(0).max(1).default(0.1),
    })
    .default({}),
});

export type ObservabilityConfig = z.infer<typeof ObservabilityConfigSchema>;

// =============================================================================
// FEATURE FLAGS
// =============================================================================

const FeatureFlagsSchema = z.object({
  enableOfflineMode: z.boolean().default(true),
  enableBadgeGeneration: z.boolean().default(true),
  enableProctoring: z.boolean().default(false),
  enableMultiTenancy: z.boolean().default(false),
  enableAdvancedAnalytics: z.boolean().default(false),
  enableLLMTutoring: z.boolean().default(true),
  enableContentSigning: z.boolean().default(true),
  maxConcurrentSessions: z.coerce.number().default(1000),
  maintenanceMode: z.boolean().default(false),
});

export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

// =============================================================================
// BILLING CONFIGURATION
// =============================================================================

const BillingConfigSchema = z.object({
  stripeSecretKey: z.string().default(''),
  stripeWebhookSecret: z.string().default(''),
  trialDays: z.coerce.number().default(14),
  taxEnabled: z.boolean().default(true),
  priceIds: z
    .object({
      individualMonthly: z.string().default(''),
      individualAnnual: z.string().default(''),
      schoolMonthly: z.string().default(''),
      schoolAnnual: z.string().default(''),
      districtMonthly: z.string().default(''),
      districtAnnual: z.string().default(''),
      enterpriseMonthly: z.string().default(''),
      enterpriseAnnual: z.string().default(''),
    })
    .default({}),
});

export type BillingConfig = z.infer<typeof BillingConfigSchema>;

// =============================================================================
// FULL APPLICATION CONFIGURATION
// =============================================================================

const AppConfigSchema = z.object({
  environment: EnvironmentSchema.default('development'),
  serviceName: z.string().default('topshelf-teaching'),
  version: z.string().default('1.0.0'),
  database: DatabaseConfigSchema,
  redis: RedisConfigSchema,
  email: EmailConfigSchema.default({}),
  auth: AuthConfigSchema,
  api: ApiServerConfigSchema,
  llm: LLMConfigSchema,
  storage: StorageConfigSchema,
  observability: ObservabilityConfigSchema,
  features: FeatureFlagsSchema,
  billing: BillingConfigSchema.default({}),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

// =============================================================================
// CONFIGURATION LOADER
// =============================================================================

export class ConfigurationManager {
  private static instance: ConfigurationManager | null = null;
  private config: AppConfig | null = null;
  private readonly sensitiveKeys = [
    'password',
    'secret',
    'apiKey',
    'accessKeyId',
    'secretAccessKey',
  ];

  private constructor() {}

  static getInstance(): ConfigurationManager {
    ConfigurationManager.instance ??= new ConfigurationManager();
    return ConfigurationManager.instance;
  }

  /**
   * Load configuration from environment variables
   */
  load(): AppConfig {
    if (this.config) {
      return this.config;
    }

    const rawConfig = {
      environment: process.env.NODE_ENV ?? 'development',
      serviceName: process.env.SERVICE_NAME,
      version: process.env.APP_VERSION,
      database: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === 'true',
        poolMin: process.env.DB_POOL_MIN,
        poolMax: process.env.DB_POOL_MAX,
        connectionTimeoutMs: process.env.DB_CONNECTION_TIMEOUT,
      },
      redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB,
        tls: process.env.REDIS_TLS === 'true',
        keyPrefix: process.env.REDIS_KEY_PREFIX,
      },
      email: {
        provider: process.env.EMAIL_PROVIDER,
        sendgridApiKey: process.env.SENDGRID_API_KEY,
        smtp: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        fromAddress: process.env.EMAIL_FROM_ADDRESS,
      },
      auth: {
        jwtSecret: process.env.JWT_SECRET,
        jwtExpiresIn: process.env.JWT_EXPIRES_IN,
        refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
        bcryptRounds: process.env.BCRYPT_ROUNDS,
        sessionSecret: process.env.SESSION_SECRET,
        allowedOrigins: process.env.ALLOWED_ORIGINS?.split(','),
        oauth: {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            enabled: process.env.GOOGLE_OAUTH_ENABLED === 'true',
          },
          microsoft: {
            clientId: process.env.MICROSOFT_CLIENT_ID,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
            tenantId: process.env.MICROSOFT_TENANT_ID,
            enabled: process.env.MICROSOFT_OAUTH_ENABLED === 'true',
          },
        },
      },
      api: {
        host: process.env.API_HOST,
        port: process.env.API_PORT ?? process.env.PORT,
        basePath: process.env.API_BASE_PATH,
        trustProxy: process.env.TRUST_PROXY === 'true',
        corsEnabled: process.env.CORS_ENABLED !== 'false',
        rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS,
        rateLimitMax: process.env.RATE_LIMIT_MAX,
        bodyLimit: process.env.BODY_LIMIT,
      },
      llm: {
        provider: process.env.LLM_PROVIDER,
        anthropic: {
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: process.env.ANTHROPIC_MODEL,
          maxTokens: process.env.ANTHROPIC_MAX_TOKENS,
        },
        openai: {
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL,
          maxTokens: process.env.OPENAI_MAX_TOKENS,
        },
        fallbackToLocal: process.env.LLM_FALLBACK_TO_LOCAL !== 'false',
        timeout: process.env.LLM_TIMEOUT,
      },
      storage: {
        provider: process.env.STORAGE_PROVIDER,
        localPath: process.env.STORAGE_LOCAL_PATH,
        s3: {
          bucket: process.env.S3_BUCKET,
          region: process.env.S3_REGION,
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          endpoint: process.env.S3_ENDPOINT,
        },
        contentPackPath: process.env.CONTENT_PACK_PATH,
        maxUploadSize: process.env.MAX_UPLOAD_SIZE,
      },
      observability: {
        logging: {
          level: process.env.LOG_LEVEL,
          format: process.env.LOG_FORMAT,
          includeTimestamp: process.env.LOG_INCLUDE_TIMESTAMP !== 'false',
          redactPII: process.env.LOG_REDACT_PII !== 'false',
        },
        metrics: {
          enabled: process.env.METRICS_ENABLED !== 'false',
          port: process.env.METRICS_PORT,
          path: process.env.METRICS_PATH,
        },
        tracing: {
          enabled: process.env.TRACING_ENABLED === 'true',
          serviceName: process.env.TRACING_SERVICE_NAME,
          endpoint: process.env.TRACING_ENDPOINT,
          sampleRate: process.env.TRACING_SAMPLE_RATE,
        },
      },
      billing: {
        stripeSecretKey: process.env.STRIPE_SECRET_KEY,
        stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        trialDays: process.env.STRIPE_TRIAL_DAYS,
        taxEnabled: process.env.STRIPE_TAX_ENABLED !== 'false',
        priceIds: {
          individualMonthly: process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY,
          individualAnnual: process.env.STRIPE_PRICE_INDIVIDUAL_ANNUAL,
          schoolMonthly: process.env.STRIPE_PRICE_SCHOOL_MONTHLY,
          schoolAnnual: process.env.STRIPE_PRICE_SCHOOL_ANNUAL,
          districtMonthly: process.env.STRIPE_PRICE_DISTRICT_MONTHLY,
          districtAnnual: process.env.STRIPE_PRICE_DISTRICT_ANNUAL,
          enterpriseMonthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
          enterpriseAnnual: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL,
        },
      },
      features: {
        enableOfflineMode: process.env.FEATURE_OFFLINE_MODE !== 'false',
        enableBadgeGeneration: process.env.FEATURE_BADGE_GENERATION !== 'false',
        enableProctoring: process.env.FEATURE_PROCTORING === 'true',
        enableMultiTenancy: process.env.FEATURE_MULTI_TENANCY === 'true',
        enableAdvancedAnalytics: process.env.FEATURE_ADVANCED_ANALYTICS === 'true',
        enableLLMTutoring: process.env.FEATURE_LLM_TUTORING !== 'false',
        enableContentSigning: process.env.FEATURE_CONTENT_SIGNING !== 'false',
        maxConcurrentSessions: process.env.MAX_CONCURRENT_SESSIONS,
        maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
      },
    };

    // Remove undefined values recursively
    const cleanConfig = this.removeUndefined(rawConfig);

    // Parse and validate
    const result = AppConfigSchema.safeParse(cleanConfig);

    if (!result.success) {
      const errors = result.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      );
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }

    this.config = result.data;
    return this.config;
  }

  /**
   * Get the current configuration (throws if not loaded)
   */
  get(): AppConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return this.config;
  }

  /**
   * Get a safe version of config for logging (sensitive values redacted)
   */
  getSafeForLogging(): Record<string, unknown> {
    const config = this.get();
    return this.redactSensitive(config as unknown as Record<string, unknown>);
  }

  /**
   * Check if running in production
   */
  isProduction(): boolean {
    return this.get().environment === 'production';
  }

  /**
   * Check if running in development
   */
  isDevelopment(): boolean {
    return this.get().environment === 'development';
  }

  /**
   * Check if a feature flag is enabled
   */
  isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    const value = this.get().features[feature];
    return typeof value === 'boolean' ? value : false;
  }

  /**
   * Reset configuration (useful for testing)
   */
  reset(): void {
    this.config = null;
  }

  private removeUndefined(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) continue;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const cleaned = this.removeUndefined(value as Record<string, unknown>);
        if (Object.keys(cleaned).length > 0) {
          result[key] = cleaned;
        }
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private redactSensitive(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.sensitiveKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
        result[key] = '[REDACTED]';
      } else if (
        value !== null &&
        value !== undefined &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        result[key] = this.redactSensitive(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export const configManager = ConfigurationManager.getInstance();

export function loadConfig(): AppConfig {
  return configManager.load();
}

export function getConfig(): AppConfig {
  return configManager.get();
}

// Re-export schemas for external validation
export {
  AppConfigSchema,
  DatabaseConfigSchema,
  RedisConfigSchema,
  AuthConfigSchema,
  ApiServerConfigSchema,
  LLMConfigSchema,
  StorageConfigSchema,
  ObservabilityConfigSchema,
  FeatureFlagsSchema,
  BillingConfigSchema,
  EnvironmentSchema,
};

export type { Environment };
