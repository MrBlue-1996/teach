# Pilot Checklist (TS-ROADMAP-013)

Pre-launch checklist for TopShelf Teaching pilot deployments.

## Phase 0: Pre-Pilot Preparation

### Infrastructure

- [ ] MCP server deployed to staging environment
- [ ] Database provisioned and configured
- [ ] KMS/HSM keys generated and secured
- [ ] CDN configured for content pack delivery
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery procedures tested

### Content

- [ ] Minimum 3 content packs validated and signed
- [ ] All teaching blocks have 2+ surface variants
- [ ] Parity tests passing for all content
- [ ] Role mappings configured for target badges
- [ ] Content review completed by SME

### Platform

- [ ] Policy configuration reviewed and approved
- [ ] Promotion thresholds calibrated for pilot cohort
- [ ] Calibration probe tested across device matrix
- [ ] Offline mode tested on baseline devices
- [ ] Service worker caching verified

### Security

- [ ] Security audit completed
- [ ] Penetration testing performed
- [ ] PII handling reviewed and approved
- [ ] Audit logging verified
- [ ] Rate limiting configured

## Phase 1: Limited Pilot (10 users)

### Week 1: Onboarding

- [ ] Pilot users recruited and briefed
- [ ] Consent forms collected
- [ ] Initial calibration completed for all users
- [ ] Baseline metrics captured
- [ ] Support channel established

### Week 2-4: Learning

- [ ] Daily monitoring of learner progress
- [ ] Weekly review of promotion decisions
- [ ] Parity test results reviewed
- [ ] User feedback collected
- [ ] Bug reports triaged

### Success Criteria

- [ ] 80%+ calibration completion rate
- [ ] <5% rollback rate
- [ ] 0 critical bugs
- [ ] Positive user feedback (NPS > 30)
- [ ] No data loss incidents

## Phase 2: Expanded Pilot (100 users)

### Prerequisites

- [ ] Phase 1 success criteria met
- [ ] Issues from Phase 1 resolved
- [ ] Scaling tested to 10x load
- [ ] Additional content packs added

### Week 1: Expansion

- [ ] Additional users onboarded
- [ ] Load monitoring increased
- [ ] Support team scaled

### Week 2-8: Full Pilot

- [ ] Bi-weekly stakeholder reviews
- [ ] Monthly metrics reports
- [ ] Continuous feedback collection
- [ ] A/B testing of policy variations

### Success Criteria

- [ ] 75%+ goal completion rate
- [ ] Time-to-competence reduction vs baseline
- [ ] <10% rollback rate
- [ ] System uptime >99.5%
- [ ] Employer artifact acceptance (if applicable)

## Phase 3: Pre-Production

### Technical Readiness

- [ ] Production infrastructure provisioned
- [ ] Disaster recovery tested
- [ ] Performance benchmarks met
- [ ] Security re-audit completed
- [ ] Compliance requirements verified

### Operational Readiness

- [ ] Runbooks updated from pilot learnings
- [ ] Support team trained
- [ ] Escalation procedures documented
- [ ] SLAs defined and agreed

### Business Readiness

- [ ] Pricing finalized (if applicable)
- [ ] Marketing materials prepared
- [ ] Legal review completed
- [ ] Partner integrations tested

## Metrics to Track

### Learning Metrics

| Metric                 | Target | Measurement                 |
| ---------------------- | ------ | --------------------------- |
| Calibration completion | >80%   | % completing 2-min probe    |
| Task completion rate   | >70%   | % completing assigned tasks |
| Time-to-competence     | -30%   | vs traditional methods      |
| Retention at 7 days    | >80%   | Retention probe pass rate   |
| Retention at 30 days   | >70%   | Retention probe pass rate   |

### Platform Metrics

| Metric              | Target | Measurement                  |
| ------------------- | ------ | ---------------------------- |
| Promotion precision | >85%   | Promotions without rollback  |
| Rollback rate       | <10%   | Demotions / total promotions |
| Parity pass rate    | 100%   | CI parity tests              |
| System uptime       | >99.5% | Availability monitoring      |
| TTFI (baseline)     | <1.5s  | Lighthouse CI                |

### User Metrics

| Metric           | Target         | Measurement    |
| ---------------- | -------------- | -------------- |
| NPS              | >40            | Survey         |
| Support tickets  | <0.1/user/week | Helpdesk       |
| Feature requests | Qualitative    | Feedback forms |
| Churn rate       | <5%/month      | User activity  |

## Risk Register

| Risk                           | Likelihood | Impact   | Mitigation                     |
| ------------------------------ | ---------- | -------- | ------------------------------ |
| Low adoption                   | Medium     | High     | User research, UX iteration    |
| Content quality issues         | Low        | High     | SME review, parity tests       |
| Performance on low-end devices | Medium     | Medium   | Device matrix testing          |
| Policy misconfiguration        | Low        | High     | Policy review, gradual rollout |
| Data loss                      | Low        | Critical | Backups, offline sync          |

## Go/No-Go Decision

### Go Criteria

- All Phase 2 success criteria met
- No unresolved critical issues
- Stakeholder approval obtained
- Technical and operational readiness confirmed

### No-Go Criteria

- Rollback rate >20%
- Data loss incidents
- Critical security vulnerabilities
- User feedback strongly negative

## Sign-off

| Role             | Name | Date | Signature |
| ---------------- | ---- | ---- | --------- |
| Product Owner    |      |      |           |
| Engineering Lead |      |      |           |
| QA Lead          |      |      |           |
| Security         |      |      |           |
| Operations       |      |      |           |
