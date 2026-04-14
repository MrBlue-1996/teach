# Incident Runbooks (TS-SEC-009)

Runbooks for handling common incidents in TopShelf Teaching platform.

## Table of Contents

1. [Promotion Misfire](#promotion-misfire)
2. [Offline Sync Failure](#offline-sync-failure)
3. [NLP Drift Detection](#nlp-drift-detection)
4. [Content Pack Signature Failure](#content-pack-signature-failure)
5. [Parity Test Failure](#parity-test-failure)
6. [High Rollback Rate Alert](#high-rollback-rate-alert)

---

## Promotion Misfire

### Symptoms

- Learner promoted to mode they're not ready for
- High failure rate post-promotion
- User complaints about difficulty spike

### Severity: Medium

### Response Time: 4 hours

### Investigation Steps

1. **Identify affected learners**

   ```sql
   SELECT learner_id, domain, from_mode, to_mode, timestamp
   FROM promotion_history
   WHERE is_rollback = false
   AND timestamp > NOW() - INTERVAL '24 hours'
   AND learner_id IN (
     SELECT learner_id FROM benchmark_results
     WHERE result = 'fail' AND timestamp > NOW() - INTERVAL '24 hours'
     GROUP BY learner_id HAVING COUNT(*) > 3
   );
   ```

2. **Review policy evaluation logs**

   ```bash
   # Find audit records for affected learner
   curl -X GET "https://api.topshelf.io/admin/audit/learner/{learner_id}" \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```

3. **Check signal values at promotion time**
   - Review `contributingSignals` in audit record
   - Verify signal confidence levels
   - Check for signal calculation errors

4. **Examine policy configuration**
   - Verify threshold values are correct
   - Check for recent policy changes
   - Review domain-specific overrides

### Remediation

1. **Immediate (within 1 hour)**
   - Rollback affected learners to previous mode
   - Add learners to manual review queue

2. **Short-term (within 24 hours)**
   - Increase probation tasks for affected domain
   - Add additional signals to required list
   - Lower thresholds temporarily

3. **Long-term (within 7 days)**
   - Adjust policy configuration
   - Add regression tests for edge case
   - Update monitoring thresholds

### Prevention

- Implement canary promotions (10% of learners first)
- Add pre-promotion simulation checks
- Increase minimum confidence thresholds

---

## Offline Sync Failure

### Symptoms

- Events not appearing in server logs
- Learner progress not updating
- IndexedDB growing unboundedly
- Client-side errors in console

### Severity: High

### Response Time: 2 hours

### Investigation Steps

1. **Check event buffer size**

   ```javascript
   // In browser console
   const cache = new OfflineCacheManager();
   await cache.init();
   const count = await cache.getBufferedEventCount();
   console.log('Buffered events:', count);
   ```

2. **Verify network connectivity**
   - Check Network Information API
   - Review service worker logs
   - Test API endpoint availability

3. **Examine sync errors**

   ```bash
   # Server-side sync error logs
   grep "SYNC_ERROR" /var/log/topshelf/mcp-server.log | tail -100
   ```

4. **Check for event validation failures**
   - Look for nonce collision errors
   - Check timestamp drift
   - Verify event schema compliance

### Remediation

1. **Immediate**
   - Enable verbose client logging
   - Extend event buffer limits
   - Add manual sync trigger for affected users

2. **Short-term**
   - Implement background sync retry
   - Add event compression
   - Increase sync frequency

3. **Long-term**
   - Add client-side sync status indicator
   - Implement conflict resolution UI
   - Add offline mode telemetry

### Prevention

- Set maximum offline duration limits
- Implement proactive sync health checks
- Add sync failure alerts

---

## NLP Drift Detection

### Symptoms

- Increasing parity test failures
- Response parsing accuracy dropping
- Unusual signal values

### Severity: Medium

### Response Time: 8 hours

### Investigation Steps

1. **Review parity metrics**

   ```bash
   # Check recent parity test results
   curl -X GET "https://api.topshelf.io/admin/metrics/parity" \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     --data '{"timeRange": "7d"}'
   ```

2. **Compare formatter outputs**
   - Run deterministic formatter on sample corpus
   - Compare with LLM adapter outputs
   - Calculate divergence rates

3. **Analyze signal distributions**
   - Check for shifts in mean/variance
   - Look for anomalous outliers
   - Compare across device tiers

### Remediation

1. **Immediate**
   - Switch to deterministic-only mode
   - Quarantine affected content packs

2. **Short-term**
   - Retrain or update LLM adapter
   - Adjust ensemble voting weights
   - Update parity thresholds

3. **Long-term**
   - Implement drift monitoring
   - Add automated retraining pipeline
   - Create fallback parser hierarchy

---

## Content Pack Signature Failure

### Symptoms

- Content pack validation errors
- "Invalid signature" errors in logs
- Content not loading for users

### Severity: Critical

### Response Time: 30 minutes

### Investigation Steps

1. **Identify affected packs**

   ```bash
   grep "INVALID_SIGNATURE" /var/log/topshelf/content-service.log | \
     awk '{print $NF}' | sort | uniq -c
   ```

2. **Verify signing key status**
   - Check KMS key rotation status
   - Verify key hasn't been revoked
   - Check key permissions

3. **Validate signature chain**
   ```bash
   # Verify pack signature
   node scripts/verify-signature.js --pack content-packs/pack-linux-v1.json
   ```

### Remediation

1. **Immediate**
   - Quarantine affected packs
   - Serve from backup/CDN cache
   - Alert content team

2. **Short-term**
   - Re-sign affected packs
   - Update signing key if compromised
   - Clear client caches

3. **Long-term**
   - Implement key rotation automation
   - Add signature verification monitoring
   - Create emergency re-signing procedure

---

## Parity Test Failure

### Symptoms

- CI parity tests failing
- Divergence count exceeding threshold
- Formatter output changes detected

### Severity: High (blocks deployment)

### Response Time: 1 hour

### Investigation Steps

1. **Review divergence details**

   ```bash
   pnpm run test:parity -- --reporter=verbose
   ```

2. **Identify changed components**
   - Check recent formatter changes
   - Review content pack updates
   - Examine schema changes

3. **Compare before/after outputs**
   ```bash
   # Generate diff of formatter outputs
   node scripts/parity-diff.js --before main --after HEAD
   ```

### Remediation

1. **If formatter change is intentional**
   - Update expected outputs
   - Increment formatter version
   - Document breaking change

2. **If formatter change is unintentional**
   - Revert formatter changes
   - Add regression test
   - Review change process

---

## High Rollback Rate Alert

### Symptoms

- Rollback rate exceeds 40% threshold
- Multiple learners demoted in short period
- Promotion precision dropping

### Severity: Medium

### Response Time: 4 hours

### Investigation Steps

1. **Analyze rollback patterns**

   ```sql
   SELECT domain, COUNT(*) as rollbacks,
          COUNT(DISTINCT learner_id) as affected_learners
   FROM promotion_history
   WHERE is_rollback = true
   AND timestamp > NOW() - INTERVAL '24 hours'
   GROUP BY domain
   ORDER BY rollbacks DESC;
   ```

2. **Review promotion criteria**
   - Check if thresholds are too low
   - Verify signal calculation accuracy
   - Look for content difficulty spikes

3. **Examine cohort performance**
   - Compare affected vs unaffected learners
   - Look for common characteristics
   - Check device/network profiles

### Remediation

1. **Immediate**
   - Pause automatic promotions
   - Switch to manual review mode

2. **Short-term**
   - Increase consecutive pass requirements
   - Lengthen probation windows
   - Add additional retention checks

3. **Long-term**
   - Recalibrate promotion thresholds
   - Implement adaptive thresholds
   - Add predictive rollback model

---

## Escalation Matrix

| Severity | Response Time | Primary Contact   | Escalation                |
| -------- | ------------- | ----------------- | ------------------------- |
| Critical | 30 min        | On-call engineer  | CTO within 1 hour         |
| High     | 2 hours       | Team lead         | Director within 4 hours   |
| Medium   | 4 hours       | Team engineer     | Team lead within 8 hours  |
| Low      | 24 hours      | Assigned engineer | Team lead within 48 hours |

## Contact Information

- **On-call rotation**: PagerDuty `#topshelf-oncall`
- **Slack channel**: `#topshelf-incidents`
- **Status page**: status.topshelf.io
