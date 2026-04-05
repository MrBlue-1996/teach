/**
 * TopShelf Service LLC - Observability Layer
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import pino, { Logger, LoggerOptions } from 'pino';
import { getConfig } from '@topshelf/config';

// =============================================================================
// PII REDACTION
// =============================================================================

const PII_PATTERNS = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN]' },
  { pattern: /\b\d{16}\b/g, replacement: '[CARD]' },
  { pattern: /password['":\s]*['"]?[^'",\s}]+['"]?/gi, replacement: 'password: [REDACTED]' },
  { pattern: /bearer\s+[a-zA-Z0-9._-]+/gi, replacement: 'Bearer [TOKEN]' },
];

function redactPII(obj: unknown): unknown {
  if (typeof obj === 'string') {
    let result = obj;
    for (const { pattern, replacement } of PII_PATTERNS) {
      result = result.replace(pattern, replacement);
    }
    return result;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactPII);
  }

  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('token') ||
        lowerKey.includes('apikey') ||
        lowerKey.includes('authorization')
      ) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactPII(value);
      }
    }
    return result;
  }

  return obj;
}

// =============================================================================
// LOGGER
// =============================================================================

let loggerInstance: Logger | null = null;

export function createLogger(name?: string): Logger {
  if (loggerInstance && !name) {
    return loggerInstance;
  }

  const config = getConfig();
  const { logging } = config.observability;

  const options: LoggerOptions = {
    name: name ?? config.serviceName,
    level: logging.level,
    timestamp: logging.includeTimestamp ? pino.stdTimeFunctions.isoTime : false,
    formatters: {
      level: (label) => ({ level: label }),
    },
    ...(logging.redactPII && {
      hooks: {
        logMethod(inputArgs, method) {
          const redactedArgs = inputArgs.map(redactPII);
          return method.apply(this, redactedArgs as Parameters<typeof method>);
        },
      },
    }),
  };

  // Use pretty printing in development
  const transport =
    logging.format === 'pretty'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined;

  const logger = transport ? pino(options, pino.transport(transport)) : pino(options);

  if (!name) {
    loggerInstance = logger;
  }

  return logger;
}

export function getLogger(): Logger {
  if (!loggerInstance) {
    return createLogger();
  }
  return loggerInstance;
}

// =============================================================================
// METRICS
// =============================================================================

interface MetricValue {
  value: number;
  timestamp: number;
  labels: Record<string, string>;
}

interface MetricDefinition {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram';
  values: MetricValue[];
  buckets?: number[];
}

class MetricsRegistry {
  private metrics: Map<string, MetricDefinition> = new Map();

  counter(name: string, help: string): Counter {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        help,
        type: 'counter',
        values: [],
      });
    }
    return new Counter(this.metrics.get(name)!);
  }

  gauge(name: string, help: string): Gauge {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        help,
        type: 'gauge',
        values: [],
      });
    }
    return new Gauge(this.metrics.get(name)!);
  }

  histogram(name: string, help: string, buckets?: number[]): Histogram {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        help,
        type: 'histogram',
        values: [],
        buckets: buckets || [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      });
    }
    return new Histogram(this.metrics.get(name)!);
  }

  // Export in Prometheus format
  export(): string {
    const lines: string[] = [];

    for (const metric of this.metrics.values()) {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      for (const value of metric.values) {
        const labels = Object.entries(value.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        const labelStr = labels ? `{${labels}}` : '';
        lines.push(`${metric.name}${labelStr} ${value.value}`);
      }
    }

    return lines.join('\n');
  }

  reset(): void {
    this.metrics.clear();
  }
}

class Counter {
  constructor(private metric: MetricDefinition) {}

  inc(labels: Record<string, string> = {}, value: number = 1): void {
    const existing = this.metric.values.find(
      (v) => JSON.stringify(v.labels) === JSON.stringify(labels)
    );
    if (existing) {
      existing.value += value;
      existing.timestamp = Date.now();
    } else {
      this.metric.values.push({ value, timestamp: Date.now(), labels });
    }
  }
}

class Gauge {
  constructor(private metric: MetricDefinition) {}

  set(labels: Record<string, string>, value: number): void {
    const existing = this.metric.values.find(
      (v) => JSON.stringify(v.labels) === JSON.stringify(labels)
    );
    if (existing) {
      existing.value = value;
      existing.timestamp = Date.now();
    } else {
      this.metric.values.push({ value, timestamp: Date.now(), labels });
    }
  }

  inc(labels: Record<string, string> = {}, value: number = 1): void {
    const existing = this.metric.values.find(
      (v) => JSON.stringify(v.labels) === JSON.stringify(labels)
    );
    if (existing) {
      existing.value += value;
    } else {
      this.metric.values.push({ value, timestamp: Date.now(), labels });
    }
  }

  dec(labels: Record<string, string> = {}, value: number = 1): void {
    this.inc(labels, -value);
  }
}

class Histogram {
  constructor(private metric: MetricDefinition) {}

  observe(labels: Record<string, string>, value: number): void {
    // Simplified histogram - just stores values
    this.metric.values.push({ value, timestamp: Date.now(), labels });
  }

  startTimer(labels: Record<string, string> = {}): () => void {
    const start = process.hrtime.bigint();
    return () => {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1e9; // Convert to seconds
      this.observe(labels, duration);
    };
  }
}

// Singleton registry
export const metrics = new MetricsRegistry();

// Pre-defined metrics
export const httpRequestsTotal = metrics.counter(
  'topshelf_http_requests_total',
  'Total HTTP requests'
);

export const httpRequestDuration = metrics.histogram(
  'topshelf_http_request_duration_seconds',
  'HTTP request duration in seconds'
);

export const activeSessions = metrics.gauge(
  'topshelf_active_sessions',
  'Number of active learning sessions'
);

export const policyEvaluationsTotal = metrics.counter(
  'topshelf_policy_evaluations_total',
  'Total policy evaluations'
);

export const dbQueryDuration = metrics.histogram(
  'topshelf_db_query_duration_seconds',
  'Database query duration in seconds'
);

// =============================================================================
// TRACING (Simplified)
// =============================================================================

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  tags: Record<string, string | number | boolean>;
  logs: Array<{ timestamp: number; message: string }>;
}

class Tracer {
  private spans: Span[] = [];

  startSpan(operationName: string, parentSpan?: Span): Span {
    const span: Span = {
      traceId: parentSpan?.traceId ?? this.generateId(),
      spanId: this.generateId(),
      ...(parentSpan && { parentSpanId: parentSpan.spanId }),
      operationName,
      startTime: Date.now(),
      tags: {},
      logs: [],
    };

    return span;
  }

  finishSpan(span: Span): void {
    span.endTime = Date.now();
    this.spans.push(span);

    // In production, send to tracing backend (Jaeger, Zipkin, etc.)
    const config = getConfig();
    if (config.observability.tracing.enabled) {
      const logger = getLogger();
      logger.debug({ span }, 'Span completed');
    }
  }

  private generateId(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  getSpans(): Span[] {
    return [...this.spans];
  }

  clear(): void {
    this.spans = [];
  }
}

export const tracer = new Tracer();

// =============================================================================
// HEALTH CHECK
// =============================================================================

export interface HealthCheck {
  name: string;
  check: () => Promise<{ healthy: boolean; message?: string }>;
}

class HealthChecker {
  private checks: HealthCheck[] = [];

  register(check: HealthCheck): void {
    this.checks.push(check);
  }

  async runAll(): Promise<{
    healthy: boolean;
    checks: Record<string, { healthy: boolean; message?: string }>;
  }> {
    const results: Record<string, { healthy: boolean; message?: string }> = {};
    let allHealthy = true;

    for (const check of this.checks) {
      try {
        const result = await check.check();
        results[check.name] = result;
        if (!result.healthy) {
          allHealthy = false;
        }
      } catch (error) {
        results[check.name] = {
          healthy: false,
          message: error instanceof Error ? error.message : 'Unknown error',
        };
        allHealthy = false;
      }
    }

    return { healthy: allHealthy, checks: results };
  }
}

export const healthChecker = new HealthChecker();

// =============================================================================
// EXPORTS
// =============================================================================

export type { Logger } from 'pino';
export { Counter, Gauge, Histogram, MetricsRegistry };
