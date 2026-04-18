import { describe, it, expect } from 'vitest';
import { ShadowValidator } from './shadow-validator.js';
import {
  ChallengePhase,
  EventType,
  InfractionType,
  MasteryDomain,
  type ChallengeEvent,
  type ChallengeState,
  type Ingredient,
} from './types.js';

function makeEvent(overrides: Partial<ChallengeEvent> = {}): ChallengeEvent {
  return {
    id: `evt_${Date.now()}_${Math.random()}`,
    type: EventType.SEQUENCE_STEP_DONE,
    timestamp: Date.now(),
    phase: ChallengePhase.SOLVE,
    data: {},
    sequenceNumber: 0,
    ...overrides,
  };
}

function makeState(overrides: Partial<ChallengeState> = {}): ChallengeState {
  return {
    challengeId: 'test',
    phase: ChallengePhase.SOLVE,
    startedAt: Date.now(),
    phaseStartedAt: Date.now(),
    timeRemainingMs: 600_000,
    ticketsCompleted: 0,
    ticketsTotal: 5,
    events: [],
    infractions: [],
    consecutiveFailures: 0,
    lastHandwashAt: Date.now(),
    wasteAccumulated: 0,
    activeSafetyViolations: [],
    domainScores: {} as Record<MasteryDomain, number>,
    isVerification: false,
    ...overrides,
  };
}

describe('ShadowValidator', () => {
  describe('sequence validation', () => {
    const sequence = ['wash', 'portion', 'season', 'cook'];

    it('in-order steps produce no infraction', () => {
      const validator = new ShadowValidator([], sequence);
      const state = makeState();

      for (const stepId of sequence) {
        const infractions = validator.evaluate(
          makeEvent({ type: EventType.SEQUENCE_STEP_DONE, data: { stepId } }),
          state
        );
        expect(infractions.filter((i) => i.type === InfractionType.WRONG_SEQUENCE)).toHaveLength(0);
      }
    });

    it('out-of-order step produces infraction', () => {
      const validator = new ShadowValidator([], sequence);
      const state = makeState();

      const infractions = validator.evaluate(
        makeEvent({ type: EventType.SEQUENCE_STEP_DONE, data: { stepId: 'cook' } }),
        state
      );

      const seqInfractions = infractions.filter((i) => i.type === InfractionType.WRONG_SEQUENCE);
      expect(seqInfractions).toHaveLength(1);
    });

    it('steps beyond ideal sequence length produce no infraction', () => {
      const validator = new ShadowValidator([], ['a', 'b']);
      const state = makeState();

      validator.evaluate(
        makeEvent({ type: EventType.SEQUENCE_STEP_DONE, data: { stepId: 'a' } }),
        state
      );
      validator.evaluate(
        makeEvent({ type: EventType.SEQUENCE_STEP_DONE, data: { stepId: 'b' } }),
        state
      );

      const infractions = validator.evaluate(
        makeEvent({ type: EventType.SEQUENCE_STEP_DONE, data: { stepId: 'extra' } }),
        state
      );

      const seqInfractions = infractions.filter((i) => i.type === InfractionType.WRONG_SEQUENCE);
      expect(seqInfractions).toHaveLength(0);
    });
  });

  describe('temperature validation', () => {
    it('value within station range produces no infraction', () => {
      const validator = new ShadowValidator();
      const state = makeState();

      const infractions = validator.evaluate(
        makeEvent({
          type: EventType.TEMP_ESTIMATED,
          data: { value: 38, target: { min: 33, max: 40 } },
        }),
        state
      );

      const tempInfractions = infractions.filter((i) => i.type === InfractionType.TEMP_DANGER_ZONE);
      expect(tempInfractions).toHaveLength(0);
    });

    it('value in danger zone (40-140°F) produces infraction', () => {
      const validator = new ShadowValidator();
      const state = makeState();

      const infractions = validator.evaluate(
        makeEvent({
          type: EventType.TEMP_ESTIMATED,
          data: { value: 75, target: { min: 33, max: 40 } },
        }),
        state
      );

      const tempInfractions = infractions.filter((i) => i.type === InfractionType.TEMP_DANGER_ZONE);
      expect(tempInfractions).toHaveLength(1);
    });

    it('value outside station target but not in danger zone produces infraction', () => {
      const validator = new ShadowValidator();
      const state = makeState();

      const infractions = validator.evaluate(
        makeEvent({
          type: EventType.TEMP_ESTIMATED,
          data: { value: 170, target: { min: 140, max: 165 } },
        }),
        state
      );

      const tempInfractions = infractions.filter((i) => i.type === InfractionType.TEMP_DANGER_ZONE);
      expect(tempInfractions).toHaveLength(1);
    });
  });

  describe('handwash validation', () => {
    it('no infraction when hands recently washed', () => {
      const validator = new ShadowValidator();
      const state = makeState({ lastHandwashAt: Date.now() });

      const infractions = validator.evaluate(
        makeEvent({ type: EventType.INGREDIENT_SELECTED, data: { ingredientId: 'ing-1' } }),
        state
      );

      const hwInfractions = infractions.filter((i) => i.type === InfractionType.HANDWASH_NEGLECT);
      expect(hwInfractions).toHaveLength(0);
    });

    it('infraction when hands not washed within interval', () => {
      const validator = new ShadowValidator();
      const longAgo = Date.now() - 60_000;
      const state = makeState({ lastHandwashAt: longAgo, phaseStartedAt: longAgo - 10_000 });

      const infractions = validator.evaluate(
        makeEvent({ type: EventType.INGREDIENT_SELECTED, data: { ingredientId: 'ing-1' } }),
        state
      );

      const hwInfractions = infractions.filter((i) => i.type === InfractionType.HANDWASH_NEGLECT);
      expect(hwInfractions).toHaveLength(1);
    });
  });

  describe('spoiled ingredient detection', () => {
    it('detects spoiled ingredient selection', () => {
      const ingredients: Ingredient[] = [
        {
          id: 'bad-beef',
          name: 'Old beef',
          category: 'protein',
          receivedAt: 0,
          useByDate: 1,
          isSpoiled: true,
          costPerUnit: 5,
          unit: 'lb',
          allergens: [],
          requiresRefrigeration: true,
        },
      ];
      const validator = new ShadowValidator(ingredients);
      const state = makeState({ lastHandwashAt: Date.now() });

      const infractions = validator.evaluate(
        makeEvent({ type: EventType.INGREDIENT_SELECTED, data: { ingredientId: 'bad-beef' } }),
        state
      );

      const spoilInfractions = infractions.filter(
        (i) => i.type === InfractionType.SPOILED_INGREDIENT_USED
      );
      expect(spoilInfractions).toHaveLength(1);
    });
  });

  describe('rule trigger filtering', () => {
    it('rules only fire for their declared triggerEvents', () => {
      const validator = new ShadowValidator([], ['a', 'b']);
      const state = makeState();

      const infractions = validator.evaluate(
        makeEvent({ type: EventType.HAND_WASH, data: {} }),
        state
      );

      const seqInfractions = infractions.filter((i) => i.type === InfractionType.WRONG_SEQUENCE);
      expect(seqInfractions).toHaveLength(0);
    });
  });
});
