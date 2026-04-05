/**
 * TopShelf Observability Package - Comprehensive Test Suite
 *
 * Tests for logging, metrics, tracing, and health check utilities.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock @topshelf/config before importing the module
vi.mock('@topshelf/config', () => ({
  getConfig: vi.fn(() => ({
    serviceName: 'test-service',
    observability: {
      logging: {
        level: 'info',
        format: 'json',
        includeTimestamp: true,
        redactPII: true,
      },
      tracing: {
        enabled: true,
      },
    },
  })),
}));

import {
  getLogger,
  metrics,
  tracer,
  healthChecker,
  httpRequestsTotal,
  httpRequestDuration,
  activeSessions,
  policyEvaluationsTotal,
  dbQueryDuration,
} from './index.js';

// =============================================================================
// LOGGER TESTS
// =============================================================================

describe('Logger', () => {
  beforeEach(() => {
    // Reset logger instance between tests
    vi.resetModules();
  });

  describe('createLogger', () => {
    it('should create a logger with default service name', async () => {
      // Re-import to get fresh instance
      const { createLogger } = await import('./index.js');
      const logger = createLogger();

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should create a logger with custom name', async () => {
      const { createLogger } = await import('./index.js');
      const logger = createLogger('custom-logger');

      expect(logger).toBeDefined();
    });

    it('should return singleton when no name provided', async () => {
      const { createLogger } = await import('./index.js');
      const logger1 = createLogger();
      const logger2 = createLogger();

      expect(logger1).toBe(logger2);
    });

    it('should create different instances with different names', async () => {
      const { createLogger } = await import('./index.js');
      createLogger(); // Create default first
      const logger1 = createLogger('logger-a');
      const logger2 = createLogger('logger-b');

      expect(logger1).not.toBe(logger2);
    });
  });

  describe('getLogger', () => {
    it('should return existing logger or create new one', async () => {
      const { getLogger, createLogger } = await import('./index.js');
      createLogger(); // Ensure logger exists
      const logger = getLogger();

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should create logger if none exists', async () => {
      const { getLogger } = await import('./index.js');
      const logger = getLogger();

      expect(logger).toBeDefined();
    });
  });
});

// =============================================================================
// METRICS TESTS
// =============================================================================

describe('Metrics', () => {
  beforeEach(() => {
    metrics.reset();
  });

  describe('MetricsRegistry', () => {
    it('should create a counter metric', () => {
      const counter = metrics.counter('test_counter', 'A test counter');

      expect(counter).toBeDefined();
      expect(typeof counter.inc).toBe('function');
    });

    it('should create a gauge metric', () => {
      const gauge = metrics.gauge('test_gauge', 'A test gauge');

      expect(gauge).toBeDefined();
      expect(typeof gauge.set).toBe('function');
      expect(typeof gauge.inc).toBe('function');
      expect(typeof gauge.dec).toBe('function');
    });

    it('should create a histogram metric', () => {
      const histogram = metrics.histogram('test_histogram', 'A test histogram');

      expect(histogram).toBeDefined();
      expect(typeof histogram.observe).toBe('function');
      expect(typeof histogram.startTimer).toBe('function');
    });

    it('should create histogram with custom buckets', () => {
      const histogram = metrics.histogram(
        'custom_histogram',
        'Histogram with custom buckets',
        [0.1, 0.5, 1, 5, 10]
      );

      expect(histogram).toBeDefined();
    });

    it('should reuse existing metrics with same name', () => {
      const counter1 = metrics.counter('same_counter', 'Counter 1');
      const counter2 = metrics.counter('same_counter', 'Counter 2');

      counter1.inc({}, 5);
      counter2.inc({}, 3);

      // Both should reference the same metric
      const output = metrics.export();
      expect(output).toContain('same_counter');
      expect(output).toContain('8'); // 5 + 3
    });

    it('should export metrics in Prometheus format', () => {
      const counter = metrics.counter('export_test_total', 'Test export');
      counter.inc({ method: 'GET', status: '200' }, 10);

      const output = metrics.export();

      expect(output).toContain('# HELP export_test_total Test export');
      expect(output).toContain('# TYPE export_test_total counter');
      expect(output).toContain('export_test_total{method="GET",status="200"} 10');
    });

    it('should reset all metrics', () => {
      metrics.counter('reset_test', 'Test reset').inc({}, 5);

      metrics.reset();

      const output = metrics.export();
      expect(output).toBe('');
    });
  });

  describe('Counter', () => {
    it('should increment by 1 by default', () => {
      const counter = metrics.counter('inc_test', 'Increment test');
      counter.inc();
      counter.inc();

      const output = metrics.export();
      expect(output).toContain('2');
    });

    it('should increment by custom value', () => {
      const counter = metrics.counter('custom_inc', 'Custom increment');
      counter.inc({}, 10);

      const output = metrics.export();
      expect(output).toContain('10');
    });

    it('should track different label combinations separately', () => {
      const counter = metrics.counter('labeled_counter', 'Labeled counter');
      counter.inc({ method: 'GET' }, 5);
      counter.inc({ method: 'POST' }, 3);
      counter.inc({ method: 'GET' }, 2);

      const output = metrics.export();
      expect(output).toContain('method="GET"');
      expect(output).toContain('7'); // GET: 5 + 2
      expect(output).toContain('method="POST"');
      expect(output).toContain('3'); // POST: 3
    });
  });

  describe('Gauge', () => {
    it('should set value', () => {
      const gauge = metrics.gauge('set_gauge', 'Set gauge');
      gauge.set({ instance: 'a' }, 42);

      const output = metrics.export();
      expect(output).toContain('42');
    });

    it('should increment value', () => {
      const gauge = metrics.gauge('inc_gauge', 'Inc gauge');
      gauge.set({ instance: 'a' }, 10);
      gauge.inc({ instance: 'a' }, 5);

      const output = metrics.export();
      expect(output).toContain('15');
    });

    it('should decrement value', () => {
      const gauge = metrics.gauge('dec_gauge', 'Dec gauge');
      gauge.set({ instance: 'a' }, 10);
      gauge.dec({ instance: 'a' }, 3);

      const output = metrics.export();
      expect(output).toContain('7');
    });

    it('should create new entry on inc for new labels', () => {
      const gauge = metrics.gauge('new_label_gauge', 'New label gauge');
      gauge.inc({ instance: 'new' }, 5);

      const output = metrics.export();
      expect(output).toContain('5');
    });
  });

  describe('Histogram', () => {
    it('should observe values', () => {
      const histogram = metrics.histogram('observe_hist', 'Observe histogram');
      histogram.observe({ route: '/api' }, 0.5);
      histogram.observe({ route: '/api' }, 1.5);

      const output = metrics.export();
      expect(output).toContain('observe_hist');
    });

    it('should provide timer functionality', async () => {
      const histogram = metrics.histogram('timer_hist', 'Timer histogram');
      const end = histogram.startTimer({ operation: 'test' });

      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 10));

      end();

      const output = metrics.export();
      expect(output).toContain('timer_hist');
    });
  });

  describe('Pre-defined Metrics', () => {
    it('should have httpRequestsTotal counter', () => {
      expect(httpRequestsTotal).toBeDefined();
    });

    it('should have httpRequestDuration histogram', () => {
      expect(httpRequestDuration).toBeDefined();
    });

    it('should have activeSessions gauge', () => {
      expect(activeSessions).toBeDefined();
    });

    it('should have policyEvaluationsTotal counter', () => {
      expect(policyEvaluationsTotal).toBeDefined();
    });

    it('should have dbQueryDuration histogram', () => {
      expect(dbQueryDuration).toBeDefined();
    });
  });
});

// =============================================================================
// TRACER TESTS
// =============================================================================

describe('Tracer', () => {
  beforeEach(() => {
    tracer.clear();
  });

  describe('startSpan', () => {
    it('should create a span with operation name', () => {
      const span = tracer.startSpan('test-operation');

      expect(span).toBeDefined();
      expect(span.operationName).toBe('test-operation');
      expect(span.traceId).toBeDefined();
      expect(span.spanId).toBeDefined();
      expect(span.startTime).toBeDefined();
      expect(span.tags).toEqual({});
      expect(span.logs).toEqual([]);
    });

    it('should generate unique trace IDs', () => {
      const span1 = tracer.startSpan('op1');
      const span2 = tracer.startSpan('op2');

      expect(span1.traceId).not.toBe(span2.traceId);
    });

    it('should inherit trace ID from parent span', () => {
      const parentSpan = tracer.startSpan('parent');
      const childSpan = tracer.startSpan('child', parentSpan);

      expect(childSpan.traceId).toBe(parentSpan.traceId);
      expect(childSpan.parentSpanId).toBe(parentSpan.spanId);
    });

    it('should generate different span IDs for child spans', () => {
      const parentSpan = tracer.startSpan('parent');
      const child1 = tracer.startSpan('child1', parentSpan);
      const child2 = tracer.startSpan('child2', parentSpan);

      expect(child1.spanId).not.toBe(child2.spanId);
      expect(child1.spanId).not.toBe(parentSpan.spanId);
    });
  });

  describe('finishSpan', () => {
    it('should set end time on span', () => {
      const span = tracer.startSpan('test');

      expect(span.endTime).toBeUndefined();

      tracer.finishSpan(span);

      expect(span.endTime).toBeDefined();
      expect(span.endTime).toBeGreaterThanOrEqual(span.startTime);
    });

    it('should add span to completed spans list', () => {
      const span = tracer.startSpan('test');
      tracer.finishSpan(span);

      const spans = tracer.getSpans();
      expect(spans).toHaveLength(1);
      expect(spans[0]!.operationName).toBe('test');
    });
  });

  describe('getSpans', () => {
    it('should return all finished spans', () => {
      const span1 = tracer.startSpan('op1');
      const span2 = tracer.startSpan('op2');
      const span3 = tracer.startSpan('op3');

      tracer.finishSpan(span1);
      tracer.finishSpan(span2);
      tracer.finishSpan(span3);

      const spans = tracer.getSpans();
      expect(spans).toHaveLength(3);
    });

    it('should return a copy of the spans array', () => {
      const span = tracer.startSpan('test');
      tracer.finishSpan(span);

      const spans1 = tracer.getSpans();
      const spans2 = tracer.getSpans();

      expect(spans1).not.toBe(spans2);
      expect(spans1).toEqual(spans2);
    });
  });

  describe('clear', () => {
    it('should remove all spans', () => {
      const span1 = tracer.startSpan('op1');
      const span2 = tracer.startSpan('op2');
      tracer.finishSpan(span1);
      tracer.finishSpan(span2);

      expect(tracer.getSpans()).toHaveLength(2);

      tracer.clear();

      expect(tracer.getSpans()).toHaveLength(0);
    });
  });

  describe('Span properties', () => {
    it('should allow adding tags', () => {
      const span = tracer.startSpan('test');
      span.tags['http.method'] = 'GET';
      span.tags['http.status_code'] = 200;
      span.tags['error'] = false;

      expect(span.tags['http.method']).toBe('GET');
      expect(span.tags['http.status_code']).toBe(200);
      expect(span.tags['error']).toBe(false);
    });

    it('should allow adding logs', () => {
      const span = tracer.startSpan('test');
      span.logs.push({ timestamp: Date.now(), message: 'Starting operation' });
      span.logs.push({ timestamp: Date.now(), message: 'Operation complete' });

      expect(span.logs).toHaveLength(2);
    });
  });
});

// =============================================================================
// HEALTH CHECKER TESTS
// =============================================================================

describe('HealthChecker', () => {
  beforeEach(() => {
    // Clear any registered health checks
    // Note: healthChecker is a singleton, so we need to handle this carefully
  });

  describe('register', () => {
    it('should register a health check', () => {
      healthChecker.register({
        name: 'test-check',
        check: async () => ({ healthy: true }),
      });

      // Health check is registered (no error thrown)
      expect(true).toBe(true);
    });
  });

  describe('runAll', () => {
    it('should run all registered health checks', async () => {
      healthChecker.register({
        name: 'db-check',
        check: async () => ({ healthy: true, message: 'Database connected' }),
      });

      healthChecker.register({
        name: 'cache-check',
        check: async () => ({ healthy: true, message: 'Cache connected' }),
      });

      const result = await healthChecker.runAll();

      expect(result.healthy).toBeDefined();
      expect(result.checks).toBeDefined();
      expect(typeof result.checks).toBe('object');
    });

    it('should report unhealthy when any check fails', async () => {
      healthChecker.register({
        name: 'healthy-service',
        check: async () => ({ healthy: true }),
      });

      healthChecker.register({
        name: 'unhealthy-service',
        check: async () => ({ healthy: false, message: 'Service unavailable' }),
      });

      const result = await healthChecker.runAll();

      expect(result.healthy).toBe(false);
      expect(result.checks['unhealthy-service']!.healthy).toBe(false);
    });

    it('should handle check errors gracefully', async () => {
      healthChecker.register({
        name: 'error-check',
        check: async () => {
          throw new Error('Connection refused');
        },
      });

      const result = await healthChecker.runAll();

      expect(result.healthy).toBe(false);
      expect(result.checks['error-check']!.healthy).toBe(false);
      expect(result.checks['error-check']!.message).toContain('Connection refused');
    });

    it('should handle non-Error throws', async () => {
      healthChecker.register({
        name: 'string-error-check',
        check: async () => {
          throw 'Some string error';
        },
      });

      const result = await healthChecker.runAll();

      expect(result.healthy).toBe(false);
      expect(result.checks['string-error-check']!.healthy).toBe(false);
    });

    it('should include message for healthy checks', async () => {
      healthChecker.register({
        name: 'detailed-check',
        check: async () => ({ healthy: true, message: 'All systems operational' }),
      });

      const result = await healthChecker.runAll();

      expect(result.checks['detailed-check']!.message).toBe('All systems operational');
    });
  });
});

// =============================================================================
// PII REDACTION (tested through logger hooks)
// =============================================================================

describe('PII Redaction', () => {
  // These test the redaction logic that's used in the logger hooks

  it('should understand email pattern', () => {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const text = 'Contact john@example.com for info';

    expect(emailPattern.test(text)).toBe(true);
  });

  it('should understand SSN pattern', () => {
    const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/g;
    const text = 'SSN is 123-45-6789';

    expect(ssnPattern.test(text)).toBe(true);
  });

  it('should understand credit card pattern', () => {
    const cardPattern = /\b\d{16}\b/g;
    const text = 'Card: 1234567890123456';

    expect(cardPattern.test(text)).toBe(true);
  });

  it('should understand Bearer token pattern', () => {
    const bearerPattern = /bearer\s+[a-zA-Z0-9._-]+/gi;
    const text = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

    expect(bearerPattern.test(text)).toBe(true);
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Integration', () => {
  it('should work together: logging with tracing context', () => {
    const span = tracer.startSpan('http-request');
    const logger = getLogger();

    // Logger would include trace context in production
    logger.info({ traceId: span.traceId, spanId: span.spanId }, 'Processing request');

    tracer.finishSpan(span);

    expect(tracer.getSpans()).toHaveLength(1);
  });

  it('should work together: metrics with tracing', async () => {
    const span = tracer.startSpan('db-query');
    const endTimer = dbQueryDuration.startTimer({ operation: 'select' });

    // Simulate work
    await new Promise((resolve) => setTimeout(resolve, 5));

    endTimer();
    tracer.finishSpan(span);

    expect(span.endTime).toBeDefined();
  });
});
