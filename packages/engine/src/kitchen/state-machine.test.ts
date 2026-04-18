import { describe, it, expect } from 'vitest';
import { ChallengeMachine } from './state-machine.js';
import {
  ChallengePhase,
  ChallengeType,
  EventType,
  InfractionSeverity,
  InfractionType,
  MasteryDomain,
  type ChallengeConfig,
  type HiddenInfraction,
} from './types.js';

function makeConfig(overrides: Partial<ChallengeConfig> = {}): ChallengeConfig {
  return {
    id: 'test-challenge',
    slug: 'test',
    type: ChallengeType.RUSH_HOUR,
    title: 'Test Challenge',
    briefing: 'Test briefing',
    timeLimitSeconds: 600,
    difficultyLevel: 3,
    recipeId: 'recipe-test',
    containsTraps: false,
    hiddenDomains: [MasteryDomain.SANITATION, MasteryDomain.FOOD_SAFETY],
    tickets: [
      {
        id: 'tk-1',
        orderNumber: 1,
        items: [{ id: 'it-1', name: 'Burger', recipeId: 'recipe-test', modifiers: [], isImpossible: false, quantity: 1 }],
        submittedAt: 0,
        priority: 'normal' as const,
        isTrapped: false,
        timeWindowSeconds: 300,
      },
    ],
    ...overrides,
  } as ChallengeConfig;
}

function makeInfraction(overrides: Partial<HiddenInfraction> = {}): HiddenInfraction {
  return {
    id: `inf_${Date.now()}`,
    type: InfractionType.HANDWASH_NEGLECT,
    severity: InfractionSeverity.MEDIUM,
    domain: MasteryDomain.SANITATION,
    timestamp: Date.now(),
    triggeredByEventId: 'evt_1',
    costImpact: 5,
    explanation: 'Test infraction',
    whyItMatters: 'Sanitation matters',
    expertApproach: 'Wash hands',
    ...overrides,
  };
}

describe('ChallengeMachine', () => {
  describe('phase transitions', () => {
    it('starts in SETUP phase', () => {
      const machine = new ChallengeMachine(makeConfig());
      expect(machine.getCurrentPhase()).toBe(ChallengePhase.SETUP);
    });

    it('SETUP → SOLVE via startSolve()', () => {
      const machine = new ChallengeMachine(makeConfig());
      machine.startSolve();
      expect(machine.getCurrentPhase()).toBe(ChallengePhase.SOLVE);
    });

    it('SOLVE → CONSEQUENCE via endSolve()', () => {
      const machine = new ChallengeMachine(makeConfig());
      machine.startSolve();
      machine.endSolve();
      expect(machine.getCurrentPhase()).toBe(ChallengePhase.CONSEQUENCE);
    });

    it('CONSEQUENCE → TEACH via enterTeach()', () => {
      const machine = new ChallengeMachine(makeConfig());
      machine.startSolve();
      machine.endSolve();
      machine.enterTeach();
      expect(machine.getCurrentPhase()).toBe(ChallengePhase.TEACH);
    });

    it('TEACH → VERIFY via enterVerify() with isVerification = true', () => {
      const machine = new ChallengeMachine(makeConfig());
      machine.startSolve();
      machine.endSolve();
      machine.enterTeach();
      const state = machine.enterVerify();
      expect(machine.getCurrentPhase()).toBe(ChallengePhase.VERIFY);
      expect(state.isVerification).toBe(true);
    });

    it('VERIFY → MASTERY via completeMastery()', () => {
      const machine = new ChallengeMachine(makeConfig());
      machine.startSolve();
      machine.endSolve();
      machine.enterTeach();
      machine.enterVerify();
      machine.completeMastery();
      expect(machine.getCurrentPhase()).toBe(ChallengePhase.MASTERY);
    });

    it('MASTERY → COMPLETED via complete()', () => {
      const machine = new ChallengeMachine(makeConfig());
      machine.startSolve();
      machine.endSolve();
      machine.enterTeach();
      machine.enterVerify();
      machine.completeMastery();
      machine.complete();
      expect(machine.getCurrentPhase()).toBe(ChallengePhase.COMPLETED);
    });

    it('throws on invalid transition', () => {
      const machine = new ChallengeMachine(makeConfig());
      expect(() => machine.completeMastery()).toThrow(/Invalid transition/);
    });
  });

  describe('event recording', () => {
    it('records events with incrementing sequence numbers', () => {
      const machine = new ChallengeMachine(makeConfig());
      machine.startSolve();
      machine.recordEvent(EventType.HAND_WASH, {});
      machine.recordEvent(EventType.HAND_WASH, {});
      const events = machine.getEventLog();
      const seqNums = events.map((e) => e.sequenceNumber);
      for (let i = 1; i < seqNums.length; i++) {
        expect(seqNums[i]).toBeGreaterThan(seqNums[i - 1]);
      }
    });
  });

  describe('infraction management', () => {
    it('tracks infractions and deducts domain scores', () => {
      const machine = new ChallengeMachine(makeConfig());
      machine.startSolve();
      const initialScore = machine.getState().domainScores[MasteryDomain.SANITATION];
      machine.addInfraction(makeInfraction({ severity: InfractionSeverity.MEDIUM }));
      expect(machine.getState().infractions).toHaveLength(1);
      expect(machine.getState().domainScores[MasteryDomain.SANITATION]).toBe(initialScore - 10);
    });

    it('does not produce NaN for unknown severity', () => {
      const machine = new ChallengeMachine(makeConfig());
      machine.startSolve();
      machine.addInfraction(makeInfraction({ severity: 'unknown' as InfractionSeverity }));
      const score = machine.getState().domainScores[MasteryDomain.SANITATION];
      expect(Number.isFinite(score)).toBe(true);
    });
  });

  describe('buildConsequence', () => {
    it('returns finite numeric fields', () => {
      const machine = new ChallengeMachine(makeConfig());
      machine.startSolve();
      machine.addInfraction(makeInfraction({ severity: InfractionSeverity.HIGH }));
      machine.endSolve();
      const consequence = machine.buildConsequence();
      expect(Number.isFinite(consequence.totalCostLost)).toBe(true);
      expect(Number.isFinite(consequence.laborCostWasted)).toBe(true);
      expect(Number.isFinite(consequence.productWasted)).toBe(true);
      expect(Number.isFinite(consequence.ticketDelaySeconds)).toBe(true);
    });

    it('assigns grade F for critical infractions', () => {
      const machine = new ChallengeMachine(makeConfig());
      machine.startSolve();
      machine.addInfraction(makeInfraction({ severity: InfractionSeverity.CRITICAL }));
      machine.endSolve();
      const consequence = machine.buildConsequence();
      expect(consequence.overallGrade).toBe('F');
    });

    it('assigns grade A+ for zero infractions', () => {
      const machine = new ChallengeMachine(makeConfig());
      machine.startSolve();
      machine.endSolve();
      const consequence = machine.buildConsequence();
      expect(consequence.overallGrade).toBe('A+');
    });
  });

  describe('grade monotonicity', () => {
    it('more infractions produce equal or lower grade', () => {
      const gradeRank: Record<string, number> = { 'A+': 6, A: 5, B: 4, C: 3, D: 2, F: 1 };
      const grades: number[] = [];

      for (let count = 0; count <= 10; count++) {
        const machine = new ChallengeMachine(makeConfig());
        machine.startSolve();
        for (let i = 0; i < count; i++) {
          machine.addInfraction(makeInfraction({ severity: InfractionSeverity.MEDIUM, id: `inf_${i}` }));
        }
        machine.endSolve();
        const consequence = machine.buildConsequence();
        grades.push(gradeRank[consequence.overallGrade]);
      }

      for (let i = 1; i < grades.length; i++) {
        expect(grades[i]).toBeLessThanOrEqual(grades[i - 1]);
      }
    });
  });

  describe('timer', () => {
    it('decrements time remaining on tick', () => {
      const machine = new ChallengeMachine(makeConfig({ timeLimitSeconds: 60 }));
      machine.startSolve();
      machine.tick(10_000);
      expect(machine.getState().timeRemainingMs).toBe(50_000);
    });

    it('does not go below zero', () => {
      const machine = new ChallengeMachine(makeConfig({ timeLimitSeconds: 10 }));
      machine.startSolve();
      machine.tick(20_000);
      expect(machine.getState().timeRemainingMs).toBe(0);
    });
  });

  describe('handwash tracking', () => {
    it('records handwash and updates lastHandwashAt', () => {
      const machine = new ChallengeMachine(makeConfig());
      machine.startSolve();
      expect(machine.getState().lastHandwashAt).toBeNull();
      machine.recordHandwash();
      expect(machine.getState().lastHandwashAt).toBeTypeOf('number');
    });
  });

  describe('ticket completion', () => {
    it('increments tickets completed', () => {
      const machine = new ChallengeMachine(makeConfig());
      machine.startSolve();
      machine.completeTicket('tk-1');
      expect(machine.getState().ticketsCompleted).toBe(1);
    });
  });

  describe('cooldown', () => {
    it('enters cooldown after 3 consecutive failures', () => {
      const machine = new ChallengeMachine(makeConfig());
      machine.startSolve();
      machine.recordFailure();
      machine.recordFailure();
      machine.recordFailure();
      const state = machine.endSolve();
      expect(state.phase).toBe(ChallengePhase.COOLDOWN);
    });
  });
});
