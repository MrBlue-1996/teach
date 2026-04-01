# 9. Testing Guide

## Overview

Comprehensive testing ensures the teaching system works reliably across all device profiles and teaching modes.

## Test Structure

```
tests/
├── constraint-engine.test.ts
├── pedagogy-engine.test.ts
└── trigger-detector.test.ts
```

## Running Tests

```bash
# Run all tests
npm test

# Watch mode (development)
npm run test:watch

# With coverage
npm test -- --coverage
```

## Test Categories

### Unit Tests

Test individual components in isolation

```typescript
describe('ConstraintEngine', () => {
  it('should reject heavy frameworks for Chromebooks', () => {
    const result = ConstraintEngine.isSuggestionSuitable('Use React', DeviceProfile.CHROMEBOOK_LOW);
    expect(result.suitable).toBe(false);
  });
});
```

### Integration Tests

Test component interactions

```typescript
describe('PedagogyEngine', () => {
  it('should coordinate trigger detection and constraints', () => {
    const context = PedagogyEngine.createContext(
      TeachingMode.L2_CONTEXTUAL,
      DeviceProfile.CHROMEBOOK_STANDARD
    );

    const response = PedagogyEngine.processTeachingRequest(context, 'Use React framework');

    expect(response.filtered).toBe(true);
  });
});
```

### API Tests

Test HTTP endpoints (future)

```typescript
describe('API', () => {
  it('should initialize session', async () => {
    const response = await fetch('/api/session/init', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'test' }),
    });

    expect(response.status).toBe(200);
  });
});
```

## Writing Good Tests

### Follow AAA Pattern

```typescript
it('should do something', () => {
  // Arrange - Set up test data
  const context = createTestContext();

  // Act - Perform the action
  const result = someFunction(context);

  // Assert - Verify the result
  expect(result).toBe(expected);
});
```

### Test Edge Cases

- Empty inputs
- Null/undefined values
- Boundary conditions
- Error scenarios

### Keep Tests Fast

- No external dependencies
- Mock where appropriate
- Parallel execution

### One Assertion per Test (Ideally)

```typescript
// Good
it('should reject large responses', () => {
  const result = filter(largeContent);
  expect(result.suitable).toBe(false);
});

it('should provide reason for rejection', () => {
  const result = filter(largeContent);
  expect(result.reason).toContain('too large');
});

// Less ideal (but sometimes ok)
it('should reject and explain large responses', () => {
  const result = filter(largeContent);
  expect(result.suitable).toBe(false);
  expect(result.reason).toContain('too large');
});
```

## Test Coverage Goals

- **Unit Tests**: > 80% coverage
- **Critical Paths**: 100% coverage
- **Edge Cases**: Comprehensive
- **Integration**: Key flows

## Testing Teaching Modes

Test each mode behaves correctly:

```typescript
describe('Teaching Modes', () => {
  const testCases = [
    { mode: TeachingMode.L0_SILENT, shouldTeach: false },
    { mode: TeachingMode.L1_MINIMAL, shouldTeach: 'only-help' },
    { mode: TeachingMode.L4_TUTORIAL, shouldTeach: true },
  ];

  testCases.forEach(({ mode, shouldTeach }) => {
    it(`mode ${mode} should teach: ${shouldTeach}`, () => {
      // Test implementation
    });
  });
});
```

## Testing Device Constraints

Validate all device profiles:

```typescript
describe('Device Profiles', () => {
  const profiles = Object.values(DeviceProfile);

  profiles.forEach((profile) => {
    describe(profile, () => {
      it('should have valid constraints', () => {
        const constraints = ConstraintEngine.getConstraints(profile);
        expect(constraints.maxMemoryMB).toBeGreaterThan(0);
      });

      it('should enforce framework restrictions', () => {
        const isChromebook = profile.includes('chromebook');
        const constraints = ConstraintEngine.getConstraints(profile);

        if (isChromebook) {
          expect(constraints.allowHeavyFrameworks).toBe(false);
        }
      });
    });
  });
});
```

## Manual Testing Checklist

### Server Functionality

- [ ] Server starts without errors
- [ ] Health endpoint responds
- [ ] All API endpoints work
- [ ] Error handling works
- [ ] Invalid requests rejected

### Teaching Modes

- [ ] L0 never teaches
- [ ] L1 teaches on help request only
- [ ] L2 teaches on triggers
- [ ] L3 teaches proactively
- [ ] L4 always teaches

### Device Constraints

- [ ] Heavy frameworks blocked for Chromebooks
- [ ] Large responses truncated
- [ ] Offline capability enforced
- [ ] Asset restrictions work

### Trigger Detection

- [ ] Repeated errors detected
- [ ] Stuck state identified
- [ ] Time thresholds work
- [ ] Mode elevation suggested

## Performance Testing

### Load Testing

```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:3000/health

# Using wrk
wrk -t4 -c100 -d30s http://localhost:3000/api/session/init
```

### Memory Testing

```bash
# Monitor memory usage
node --expose-gc dist/index.js

# Check for leaks
node --inspect dist/index.js
# Then use Chrome DevTools
```

## Continuous Integration

Tests run automatically on:

- Every push to main/develop
- All pull requests
- Before deployment

See `.github/workflows/ci.yml` for configuration.

## Debugging Tests

```bash
# Run single test file
npm test -- constraint-engine.test.ts

# Run with verbose output
npm test -- --reporter=verbose

# Debug with Node inspector
node --inspect-brk node_modules/.bin/vitest
```

## Best Practices

1. **Test Behavior, Not Implementation**: Test what it does, not how
2. **Write Tests First (TDD)**: Design through tests
3. **Keep Tests Simple**: Easy to understand and maintain
4. **Fail Fast**: Quick feedback on failures
5. **Isolate Tests**: Independent, no shared state
