/**
 * TopShelf Config Package - Comprehensive Test Suite
 *
 * Tests for configuration loading, validation, environment variable parsing,
 * default values, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// We need to test the ConfigurationManager directly, so we import after
// manipulating environment variables.

describe('ConfigurationManager', () => {
  let originalEnv: NodeJS.ProcessEnv;

  const optionalEnvOverrideKeys = [
    'DATABASE_URL',
    'SUPABASE_DB_URL',
    'DB_HOST',
    'DB_PORT',
    'DB_SSL',
    'DB_POOL_MIN',
    'DB_POOL_MAX',
    'DB_CONNECTION_TIMEOUT',
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_PASSWORD',
    'REDIS_DB',
    'REDIS_TLS',
    'REDIS_KEY_PREFIX',
    'EMAIL_PROVIDER',
    'SENDGRID_API_KEY',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'EMAIL_FROM_ADDRESS',
    'JWT_EXPIRES_IN',
    'REFRESH_TOKEN_EXPIRES_IN',
    'BCRYPT_ROUNDS',
    'ALLOWED_ORIGINS',
    'API_HOST',
    'API_PORT',
    'PORT',
    'API_BASE_PATH',
    'TRUST_PROXY',
    'CORS_ENABLED',
    'RATE_LIMIT_WINDOW_MS',
    'RATE_LIMIT_MAX',
    'BODY_LIMIT',
    'FEATURE_OFFLINE_MODE',
    'FEATURE_BADGE_GENERATION',
    'FEATURE_PROCTORING',
    'FEATURE_MULTI_TENANCY',
    'FEATURE_ADVANCED_ANALYTICS',
    'FEATURE_LLM_TUTORING',
    'FEATURE_CONTENT_SIGNING',
    'MAX_CONCURRENT_SESSIONS',
    'MAINTENANCE_MODE',
    'LLM_PROVIDER',
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_MODEL',
    'ANTHROPIC_MAX_TOKENS',
    'OPENAI_API_KEY',
    'OPENAI_MODEL',
    'OPENAI_MAX_TOKENS',
    'LLM_FALLBACK_TO_LOCAL',
    'LLM_TIMEOUT',
  ] as const;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Reset module registry to get fresh ConfigurationManager instances
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  /**
   * Helper to set minimum required env vars for a valid config
   */
  function clearOptionalEnvOverrides(): void {
    for (const envKey of optionalEnvOverrideKeys) {
      Reflect.deleteProperty(process.env, envKey);
    }
  }

  function setMinimalEnv(): void {
    clearOptionalEnvOverrides();

    process.env.DB_NAME = 'topshelf_test';
    process.env.DB_USER = 'testuser';
    process.env.DB_PASSWORD = 'testpassword';
    process.env.JWT_SECRET = 'a-very-long-jwt-secret-that-is-at-least-32-characters';
    process.env.SESSION_SECRET = 'a-very-long-session-secret-that-is-at-least-32-chars';
    // Storage provider must be set because removeUndefined strips the entire
    // storage object if all sub-properties are undefined, causing validation
    // to fail since storage is a required config section.
    process.env.STORAGE_PROVIDER = 'local';
  }

  async function loadFreshConfig(): Promise<typeof import('./index.js')> {
    const mod = await import('./index.js');
    // Reset the singleton so we get a fresh load
    mod.configManager.reset();
    return mod;
  }

  describe('load()', () => {
    it('should load configuration with all required environment variables', async () => {
      setMinimalEnv();
      const { loadConfig } = await loadFreshConfig();

      const config = loadConfig();

      expect(config).toBeDefined();
      expect(config.database.database).toBe('topshelf_test');
      expect(config.database.username).toBe('testuser');
      expect(config.auth.jwtSecret).toContain('a-very-long-jwt-secret');
    });

    it('should apply default values when optional env vars are missing', async () => {
      setMinimalEnv();
      const { loadConfig } = await loadFreshConfig();
      clearOptionalEnvOverrides();

      const config = loadConfig();

      // Database defaults
      expect(config.database.host).toBe('localhost');
      expect(config.database.port).toBe(5432);
      expect(config.database.ssl).toBe(false);
      expect(config.database.poolMin).toBe(2);
      expect(config.database.poolMax).toBe(10);

      // Redis defaults
      expect(config.redis.host).toBe('localhost');
      expect(config.redis.port).toBe(6379);

      // API defaults
      expect(config.api.host).toBe('0.0.0.0');
      expect(config.api.port).toBe(3000);
      expect(config.api.basePath).toBe('/api/v1');

      // Auth defaults
      expect(config.auth.jwtExpiresIn).toBe('15m');
      expect(config.auth.refreshTokenExpiresIn).toBe('7d');
      expect(config.auth.bcryptRounds).toBe(12);

      // Feature flag defaults
      expect(config.features.enableOfflineMode).toBe(true);
      expect(config.features.maintenanceMode).toBe(false);
    });

    it('should throw when required database name is missing', async () => {
      // The config module calls dotenv at import time (loads root .env which has
      // DB_NAME=topshelf). We must delete DB_NAME AFTER the module is re-imported
      // but BEFORE loadConfig() reads process.env.
      process.env.DB_USER = 'testuser';
      process.env.DB_PASSWORD = 'testpassword';
      process.env.JWT_SECRET = 'a-very-long-jwt-secret-that-is-at-least-32-characters';
      process.env.SESSION_SECRET = 'a-very-long-session-secret-that-is-at-least-32-chars';

      const { loadConfig } = await loadFreshConfig();

      // Delete AFTER import so dotenv re-injection is undone before parse.
      delete process.env.DB_NAME;

      expect(() => loadConfig()).toThrow('Configuration validation failed');
    });

    it('should load when database credentials are provided via DATABASE_URL', async () => {
      clearOptionalEnvOverrides();
      process.env.DATABASE_URL =
        'postgres://url_user:url_password@db.example.supabase.co:5432/url_database?sslmode=require';
      process.env.JWT_SECRET = 'a-very-long-jwt-secret-that-is-at-least-32-characters';
      process.env.SESSION_SECRET = 'a-very-long-session-secret-that-is-at-least-32-chars';
      process.env.STORAGE_PROVIDER = 'local';

      const { loadConfig } = await loadFreshConfig();
      const config = loadConfig();

      expect(config.database.host).toBe('db.example.supabase.co');
      expect(config.database.port).toBe(5432);
      expect(config.database.database).toBe('url_database');
      expect(config.database.username).toBe('url_user');
      expect(config.database.password).toBe('url_password');
      expect(config.database.ssl).toBe(true);
    });

    it('should throw when JWT secret is too short', async () => {
      setMinimalEnv();
      process.env.JWT_SECRET = 'short'; // Less than 32 chars

      const { loadConfig } = await loadFreshConfig();

      expect(() => loadConfig()).toThrow('Configuration validation failed');
    });

    it('should throw when session secret is too short', async () => {
      setMinimalEnv();
      process.env.SESSION_SECRET = 'short';

      const { loadConfig } = await loadFreshConfig();

      expect(() => loadConfig()).toThrow('Configuration validation failed');
    });

    it('should parse numeric environment variables correctly', async () => {
      setMinimalEnv();
      process.env.API_PORT = '8080';
      process.env.DB_POOL_MAX = '20';
      process.env.RATE_LIMIT_MAX = '200';

      const { loadConfig } = await loadFreshConfig();
      const config = loadConfig();

      expect(config.api.port).toBe(8080);
      expect(config.database.poolMax).toBe(20);
      expect(config.api.rateLimitMax).toBe(200);
    });

    it('should parse boolean environment variables correctly', async () => {
      setMinimalEnv();
      process.env.DB_SSL = 'true';
      process.env.TRUST_PROXY = 'true';
      process.env.FEATURE_PROCTORING = 'true';
      process.env.MAINTENANCE_MODE = 'true';

      const { loadConfig } = await loadFreshConfig();
      const config = loadConfig();

      expect(config.database.ssl).toBe(true);
      expect(config.api.trustProxy).toBe(true);
      expect(config.features.enableProctoring).toBe(true);
      expect(config.features.maintenanceMode).toBe(true);
    });

    it('should parse comma-separated allowed origins', async () => {
      setMinimalEnv();
      process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://app.topshelf.com';

      const { loadConfig } = await loadFreshConfig();
      const config = loadConfig();

      expect(config.auth.allowedOrigins).toEqual([
        'http://localhost:3000',
        'https://app.topshelf.com',
      ]);
    });

    it('should accept valid environment values', async () => {
      setMinimalEnv();
      process.env.NODE_ENV = 'production';

      const { loadConfig } = await loadFreshConfig();
      const config = loadConfig();

      expect(config.environment).toBe('production');
    });

    it('should default environment to development', async () => {
      setMinimalEnv();
      delete process.env.NODE_ENV;

      const { loadConfig } = await loadFreshConfig();
      const config = loadConfig();

      expect(config.environment).toBe('development');
    });

    it('should cache configuration after first load', async () => {
      setMinimalEnv();
      const { configManager } = await loadFreshConfig();

      const config1 = configManager.load();
      const config2 = configManager.load();

      expect(config1).toBe(config2); // Same reference
    });
  });

  describe('get()', () => {
    it('should throw if config not yet loaded', async () => {
      const { configManager } = await loadFreshConfig();

      expect(() => configManager.get()).toThrow('Configuration not loaded');
    });

    it('should return config after load', async () => {
      setMinimalEnv();
      const { configManager } = await loadFreshConfig();

      configManager.load();
      const config = configManager.get();

      expect(config).toBeDefined();
      expect(config.database.database).toBe('topshelf_test');
    });
  });

  describe('reset()', () => {
    it('should clear cached configuration', async () => {
      setMinimalEnv();
      const { configManager } = await loadFreshConfig();

      configManager.load();
      configManager.reset();

      expect(() => configManager.get()).toThrow('Configuration not loaded');
    });
  });

  describe('isProduction() / isDevelopment()', () => {
    it('should detect production environment', async () => {
      setMinimalEnv();
      process.env.NODE_ENV = 'production';
      const { configManager } = await loadFreshConfig();

      configManager.load();

      expect(configManager.isProduction()).toBe(true);
      expect(configManager.isDevelopment()).toBe(false);
    });

    it('should detect development environment', async () => {
      setMinimalEnv();
      process.env.NODE_ENV = 'development';
      const { configManager } = await loadFreshConfig();

      configManager.load();

      expect(configManager.isProduction()).toBe(false);
      expect(configManager.isDevelopment()).toBe(true);
    });
  });

  describe('isFeatureEnabled()', () => {
    it('should return true for enabled feature', async () => {
      setMinimalEnv();
      process.env.FEATURE_PROCTORING = 'true';
      const { configManager } = await loadFreshConfig();

      configManager.load();

      expect(configManager.isFeatureEnabled('enableProctoring')).toBe(true);
    });

    it('should return false for disabled feature', async () => {
      setMinimalEnv();
      const { configManager } = await loadFreshConfig();

      configManager.load();

      expect(configManager.isFeatureEnabled('enableProctoring')).toBe(false);
    });

    it('should return false for numeric feature flags', async () => {
      setMinimalEnv();
      const { configManager } = await loadFreshConfig();

      configManager.load();

      // maxConcurrentSessions is a number, not boolean
      expect(configManager.isFeatureEnabled('maxConcurrentSessions')).toBe(false);
    });
  });

  describe('getSafeForLogging()', () => {
    it('should redact sensitive values', async () => {
      setMinimalEnv();
      const { configManager } = await loadFreshConfig();

      configManager.load();
      const safe = configManager.getSafeForLogging();

      // Check that password-like keys are redacted
      const db = safe.database as Record<string, unknown>;
      expect(db.password).toBe('[REDACTED]');

      const auth = safe.auth as Record<string, unknown>;
      expect(auth.jwtSecret).toBe('[REDACTED]');
      expect(auth.sessionSecret).toBe('[REDACTED]');
    });

    it('should preserve non-sensitive values', async () => {
      setMinimalEnv();
      const { configManager } = await loadFreshConfig();
      clearOptionalEnvOverrides();

      configManager.load();
      const safe = configManager.getSafeForLogging();

      const db = safe.database as Record<string, unknown>;
      expect(db.host).toBe('localhost');
      expect(db.port).toBe(5432);
    });
  });

  describe('LLM Configuration', () => {
    it('should default to anthropic provider', async () => {
      setMinimalEnv();
      const { loadConfig } = await loadFreshConfig();

      const config = loadConfig();

      expect(config.llm.provider).toBe('anthropic');
      expect(config.llm.fallbackToLocal).toBe(true);
    });

    it('should accept custom LLM provider', async () => {
      setMinimalEnv();
      process.env.LLM_PROVIDER = 'openai';

      const { loadConfig } = await loadFreshConfig();
      const config = loadConfig();

      expect(config.llm.provider).toBe('openai');
    });
  });

  describe('Storage Configuration', () => {
    it('should default to local storage provider', async () => {
      setMinimalEnv();
      const { loadConfig } = await loadFreshConfig();

      const config = loadConfig();

      expect(config.storage.provider).toBe('local');
      expect(config.storage.localPath).toBe('./storage');
    });
  });
});
