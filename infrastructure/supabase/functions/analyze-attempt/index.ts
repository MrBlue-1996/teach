/**
 * TopShelf Service LLC - Analyze Attempt Edge Function
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Supabase Edge Function that runs after a challenge attempt is submitted.
 * Reads the raw event log, detects hidden failures, compares user sequence
 * to ideal, calculates costs, and returns the Teach payload.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.0';

interface ChallengeEvent {
  id: string;
  type: string;
  timestamp: number;
  phase: string;
  data: Record<string, unknown>;
  sequenceNumber: number;
}

interface RecipeStep {
  id: string;
  order: number;
  instruction: string;
  whyExplanation: string;
  timeSeconds: number;
  isCCP: boolean;
  tools: string[];
  targetTemp?: number;
  tempRange?: { min: number; max: number };
}

interface HiddenInfraction {
  infraction_type: string;
  severity: string;
  domain: string;
  trigger_event_id: string;
  cost_impact: number;
  explanation: string;
  why_it_matters: string;
  expert_approach: string;
}

const DOMAIN_WEIGHTS: Record<string, number> = {
  sanitation: 1.5,
  food_safety: 2.0,
  efficiency: 1.0,
  sequencing: 1.0,
  kitchen_math: 0.8,
  waste_management: 1.0,
  speed: 0.8,
  plating: 0.7,
  judgment: 1.5,
  osha_safety: 1.8,
  inventory: 0.9,
  labor_cost: 0.8,
};

Deno.serve(async (req: Request) => {
  try {
    const { attemptId } = await req.json();

    if (!attemptId) {
      return new Response(JSON.stringify({ error: 'attemptId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Fetch the attempt with its event log
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) {
      return new Response(
        JSON.stringify({ error: 'Attempt not found', details: attemptError }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch the recipe (expert standard)
    const { data: recipe } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', attempt.recipe_id)
      .single();

    // 3. Fetch the challenge definition
    const { data: challenge } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', attempt.challenge_id)
      .single();

    const eventLog: ChallengeEvent[] = attempt.event_log || [];
    const idealSequence: string[] = recipe?.ideal_sequence || [];
    const recipeSteps: RecipeStep[] = recipe?.steps || [];

    // 4. Analyze the event log for hidden failures
    const infractions = analyzeEventLog(eventLog, idealSequence, challenge);

    // 5. Calculate costs
    const totalCostLost = infractions.reduce(
      (sum: number, inf: HiddenInfraction) => sum + inf.cost_impact,
      0
    );
    const wasteValue = Number(attempt.waste_accumulated) || 0;

    // 6. Compare user sequence to ideal
    const userSequence = extractUserSequence(eventLog);
    const sequenceMismatches = compareSequences(userSequence, idealSequence);

    // 7. Calculate domain scores
    const domainScores = calculateDomainScores(infractions);

    // 8. Determine primary failure domain
    const primaryDomain = findPrimaryFailure(infractions);

    // 9. Calculate overall grade
    const grade = calculateGrade(infractions);

    // 10. Calculate time metrics
    const solveStart = eventLog.find((e) => e.type === 'challenge_started')?.timestamp || 0;
    const solveEnd =
      eventLog.find((e) => e.type === 'phase_transition' && e.data['to'] === 'consequence')
        ?.timestamp || Date.now();
    const userTimeSeconds = Math.round((solveEnd - solveStart) / 1000);

    // 11. Build targeted lessons based on actual mistakes
    const lessons = buildTargetedLessons(infractions, recipeSteps);

    // 12. Build replay markers
    const replayMarkers = infractions.map((inf: HiddenInfraction) => ({
      eventId: inf.trigger_event_id,
      label: inf.explanation.substring(0, 80),
      severity: inf.severity,
      domain: inf.domain,
    }));

    // 13. Build consequence payload
    const consequencePayload = {
      totalCostLost: totalCostLost + wasteValue,
      laborCostWasted: estimateLaborCost(userTimeSeconds, infractions.length),
      productWasted: wasteValue,
      ticketDelaySeconds: calculateTicketDelay(
        attempt.tickets_completed,
        attempt.tickets_total,
        userTimeSeconds,
        challenge?.time_limit_seconds || 0
      ),
      safetyRisks: infractions
        .filter(
          (inf: HiddenInfraction) =>
            inf.severity === 'critical' || inf.severity === 'high'
        )
        .map((inf: HiddenInfraction) => ({
          type: inf.infraction_type,
          severity: inf.severity,
          realWorldConsequence: inf.why_it_matters,
        })),
      infractionCount: infractions.length,
      overallGrade: grade,
      primaryFailureDomain: primaryDomain,
      headline: generateHeadline(grade, primaryDomain, totalCostLost + wasteValue),
    };

    // 14. Build teach payload
    const teachPayload = {
      expertRecipe: recipe
        ? {
            id: recipe.id,
            name: recipe.name,
            station: recipe.station,
            steps: recipe.steps,
            criticalControlPoints: recipe.critical_control_points,
            idealSequence: recipe.ideal_sequence,
            wasteValuePerPlate: recipe.waste_value_per_plate,
            targetTimeSeconds: recipe.target_time_seconds,
            platingStandard: recipe.plating_standard,
          }
        : null,
      comparison: {
        userSequence,
        expertSequence: idealSequence,
        sequenceMismatches,
        userTimeSeconds,
        expertTimeSeconds: recipe?.target_time_seconds || 0,
        userWasteValue: wasteValue,
        expertWasteValue: recipe?.waste_value_per_plate || 0,
      },
      lessons,
      replayMarkers,
    };

    // 15. Persist infractions to the hidden_infractions table
    if (infractions.length > 0) {
      const infractionRows = infractions.map((inf: HiddenInfraction) => ({
        attempt_id: attemptId,
        user_id: attempt.user_id,
        ...inf,
      }));

      await supabase.from('hidden_infractions').insert(infractionRows);
    }

    // 16. Update the attempt with payloads and grade
    await supabase
      .from('attempts')
      .update({
        status: 'teaching',
        consequence_payload: consequencePayload,
        teach_payload: teachPayload,
        domain_scores: domainScores,
        overall_grade: grade,
        solve_ended_at: new Date().toISOString(),
        teach_started_at: new Date().toISOString(),
        time_spent_seconds: userTimeSeconds,
      })
      .eq('id', attemptId);

    // 17. Update user mastery scores
    await updateUserMastery(supabase, attempt.user_id, domainScores, infractions);

    // 18. Update equipment proficiency if applicable
    if (recipe?.station) {
      await updateEquipmentProficiency(
        supabase,
        attempt.user_id,
        recipe.station,
        grade
      );
    }

    return new Response(
      JSON.stringify({
        consequencePayload,
        teachPayload,
        domainScores,
        grade,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal error', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// =============================================================================
// ANALYSIS FUNCTIONS
// =============================================================================

function analyzeEventLog(
  events: ChallengeEvent[],
  idealSequence: string[],
  challenge: Record<string, unknown> | null
): HiddenInfraction[] {
  const infractions: HiddenInfraction[] = [];
  let lastHandwash = 0;
  let sequenceIndex = 0;
  const recentProteinTouch: number[] = [];
  let ingredientsUsed = 0;
  let ingredientsDiscarded = 0;

  for (const event of events) {
    // Handwash tracking
    if (event.type === 'hand_wash') {
      lastHandwash = event.timestamp;
      continue;
    }

    // Check handwash interval on food contact events
    if (
      ['ingredient_selected', 'cooking_action', 'plate_submitted'].includes(event.type) &&
      lastHandwash > 0
    ) {
      const elapsed = event.timestamp - lastHandwash;
      if (elapsed > 30000) {
        infractions.push({
          infraction_type: 'handwash_neglect',
          severity: 'high',
          domain: 'sanitation',
          trigger_event_id: event.id,
          cost_impact: 0,
          explanation: `Handled food without washing for ${Math.round(elapsed / 1000)}s.`,
          why_it_matters:
            'Cross-contamination from unwashed hands causes 40% of foodborne illness outbreaks.',
          expert_approach:
            'Wash hands between every task switch, after raw proteins, before plating.',
        });
        lastHandwash = event.timestamp; // Reset to avoid duplicate flags
      }
    }

    // Cross-contamination check
    if (event.type === 'ingredient_selected') {
      ingredientsUsed++;
      const category = event.data['category'] as string;
      if (category === 'protein') {
        recentProteinTouch.push(event.timestamp);
      } else if (
        (category === 'produce' || category === 'dairy') &&
        recentProteinTouch.some((t) => event.timestamp - t < 10000)
      ) {
        infractions.push({
          infraction_type: 'cross_contamination',
          severity: 'critical',
          domain: 'food_safety',
          trigger_event_id: event.id,
          cost_impact: 50,
          explanation: `Touched ${event.data['name']} after handling raw protein without washing.`,
          why_it_matters:
            'Cross-contamination between raw proteins and ready-to-eat foods can cause salmonella, E. coli outbreaks.',
          expert_approach:
            'Always wash hands and sanitize between raw protein and any other ingredient category.',
        });
      }
    }

    // FIFO violation
    if (event.type === 'ingredient_selected' && event.data['fifoViolation']) {
      infractions.push({
        infraction_type: 'fifo_violation',
        severity: 'medium',
        domain: 'inventory',
        trigger_event_id: event.id,
        cost_impact: 8,
        explanation: `Used newer ${event.data['name']} when older stock was available.`,
        why_it_matters:
          'FIFO prevents spoilage and waste. Skipping older stock means product expires unused.',
        expert_approach: 'Always check dates. Use oldest first. Rotate during deliveries.',
      });
    }

    // Spoilage
    if (event.type === 'ingredient_selected' && event.data['isSpoiled']) {
      infractions.push({
        infraction_type: 'spoiled_ingredient_used',
        severity: 'critical',
        domain: 'food_safety',
        trigger_event_id: event.id,
        cost_impact: 25,
        explanation: `Used ${event.data['name']} that is past use-by date.`,
        why_it_matters:
          'Serving spoiled food causes illness and carries legal liability.',
        expert_approach:
          'Check dates before every use. When in doubt, throw it out.',
      });
    }

    // Sequence validation
    if (event.type === 'sequence_step_done') {
      const stepId = event.data['stepId'] as string;
      const expected = idealSequence[sequenceIndex];
      if (stepId && expected && stepId !== expected) {
        infractions.push({
          infraction_type: 'wrong_sequence',
          severity: 'medium',
          domain: 'sequencing',
          trigger_event_id: event.id,
          cost_impact: 5,
          explanation: `Step "${stepId}" out of order. Expected "${expected}".`,
          why_it_matters:
            'Wrong order causes timing mistakes, temperature errors, and late tickets.',
          expert_approach: 'Follow recipe sequence. Each step is ordered for timing and safety.',
        });
      }
      sequenceIndex++;
    }

    // Unsafe order accepted
    if (event.type === 'ticket_completed') {
      if (event.data['isImpossible'] && !event.data['wasRejected']) {
        infractions.push({
          infraction_type: 'impossible_order_accepted',
          severity: 'critical',
          domain: 'judgment',
          trigger_event_id: event.id,
          cost_impact: 100,
          explanation: `Served an unsafe order: ${event.data['impossibleReason'] || 'unsafe item'}.`,
          why_it_matters:
            'Serving undercooked poultry or unsafe food can cause illness and close a restaurant.',
          expert_approach:
            'Reject orders that violate food safety. Communicate with FOH.',
        });
      }
    }

    // Waste tracking
    if (event.type === 'ingredient_discarded') {
      ingredientsDiscarded++;
    }

    // Temperature danger zone
    if (event.type === 'temp_estimated') {
      const est = event.data['estimatedTemp'] as number;
      if (est >= 40 && est <= 140) {
        infractions.push({
          infraction_type: 'temp_danger_zone',
          severity: 'high',
          domain: 'food_safety',
          trigger_event_id: event.id,
          cost_impact: 30,
          explanation: `Temperature estimate ${est}°F is in the danger zone (40-140°F).`,
          why_it_matters:
            'Danger zone allows rapid bacterial growth. Food in this range >2 hours must be discarded.',
          expert_approach:
            'Verify temps with calibrated thermometer. Hot >140°F, cold <40°F.',
        });
      }
    }

    // Math errors
    if (event.type === 'conversion_attempted' || event.type === 'recipe_scaled') {
      const userAnswer = event.data['userAnswer'] as number;
      const correctAnswer = event.data['correctAnswer'] as number;
      if (userAnswer && correctAnswer) {
        const error = Math.abs(userAnswer - correctAnswer) / correctAnswer;
        if (error > 0.05) {
          infractions.push({
            infraction_type: 'conversion_error',
            severity: 'medium',
            domain: 'kitchen_math',
            trigger_event_id: event.id,
            cost_impact: 4,
            explanation: `Conversion error: ${userAnswer} vs correct ${correctAnswer} (${Math.round(error * 100)}% off).`,
            why_it_matters:
              'Math errors mean wrong portions, wasted product, inconsistent quality.',
            expert_approach:
              'Master conversions: 3 tsp=1 tbsp, 16 tbsp=1 cup. Practice scaling by 1.5x and 0.5x.',
          });
        }
      }
    }
  }

  // Check overall waste rate
  const totalIngredients = ingredientsUsed + ingredientsDiscarded;
  if (totalIngredients > 0 && ingredientsDiscarded / totalIngredients > 0.15) {
    infractions.push({
      infraction_type: 'excessive_waste',
      severity: 'medium',
      domain: 'waste_management',
      trigger_event_id: 'aggregate',
      cost_impact: 10,
      explanation: `Waste rate ${Math.round((ingredientsDiscarded / totalIngredients) * 100)}% exceeds 15% threshold.`,
      why_it_matters:
        'Food waste reduces profit margin. Every point above 10% is lost money.',
      expert_approach:
        'Plan prep quantities, use trim for stocks, communicate about FIFO priorities.',
    });
  }

  return infractions;
}

function extractUserSequence(events: ChallengeEvent[]): string[] {
  return events
    .filter((e) => e.type === 'sequence_step_done')
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
    .map((e) => e.data['stepId'] as string)
    .filter(Boolean);
}

function compareSequences(
  userSeq: string[],
  expertSeq: string[]
): Array<{ position: number; userStep: string; expertStep: string; impact: string }> {
  const mismatches: Array<{
    position: number;
    userStep: string;
    expertStep: string;
    impact: string;
  }> = [];

  const maxLen = Math.max(userSeq.length, expertSeq.length);
  for (let i = 0; i < maxLen; i++) {
    const u = userSeq[i] || '(missing)';
    const e = expertSeq[i] || '(extra)';
    if (u !== e) {
      mismatches.push({
        position: i + 1,
        userStep: u,
        expertStep: e,
        impact:
          i < expertSeq.length
            ? 'Step done out of order — may affect timing or quality.'
            : 'Extra step not in expert sequence.',
      });
    }
  }

  return mismatches;
}

function calculateDomainScores(
  infractions: HiddenInfraction[]
): Record<string, number> {
  const scores: Record<string, number> = {};
  const allDomains = Object.keys(DOMAIN_WEIGHTS);

  for (const d of allDomains) {
    scores[d] = 100;
  }

  for (const inf of infractions) {
    const weight = DOMAIN_WEIGHTS[inf.domain] || 1.0;
    const deduction =
      inf.severity === 'critical'
        ? 35
        : inf.severity === 'high'
          ? 20
          : inf.severity === 'medium'
            ? 10
            : 5;
    scores[inf.domain] = Math.max(
      0,
      (scores[inf.domain] || 100) - deduction * weight
    );
  }

  return scores;
}

function findPrimaryFailure(infractions: HiddenInfraction[]): string {
  const counts: Record<string, number> = {};
  for (const inf of infractions) {
    counts[inf.domain] = (counts[inf.domain] || 0) + 1;
  }
  let max = 'efficiency';
  let maxCount = 0;
  for (const [domain, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      max = domain;
    }
  }
  return max;
}

function calculateGrade(infractions: HiddenInfraction[]): string {
  const critical = infractions.filter((i) => i.severity === 'critical').length;
  const high = infractions.filter((i) => i.severity === 'high').length;
  const total = infractions.length;

  if (critical > 0) return 'F';
  if (high >= 3 || total >= 8) return 'D';
  if (high >= 1 || total >= 5) return 'C';
  if (total >= 3) return 'B';
  if (total >= 1) return 'A';
  return 'A+';
}

function estimateLaborCost(timeSeconds: number, infractionCount: number): number {
  const hourlyRate = 18;
  const hours = timeSeconds / 3600;
  const inefficiency = infractionCount * 0.05;
  return Math.round(hourlyRate * hours * inefficiency * 100) / 100;
}

function calculateTicketDelay(
  completed: number,
  total: number,
  actualSeconds: number,
  budgetSeconds: number
): number {
  if (total === 0 || completed === 0) return actualSeconds > budgetSeconds ? actualSeconds - budgetSeconds : 0;
  const expectedPer = budgetSeconds / total;
  const actualPer = actualSeconds / completed;
  return Math.max(0, Math.round(actualPer - expectedPer));
}

function generateHeadline(
  grade: string,
  domain: string,
  cost: number
): string {
  const d = domain.replace(/_/g, ' ');
  if (grade === 'F')
    return `Critical safety failure. $${cost.toFixed(2)} at risk. A real kitchen would shut this station down.`;
  if (grade === 'D')
    return `Major issues in ${d}. $${cost.toFixed(2)} lost. This gets you pulled aside by the chef.`;
  if (grade === 'C')
    return `Needs work. ${d} is your weak spot. $${cost.toFixed(2)} in waste and errors.`;
  if (grade === 'B') return `Solid effort, but corrections needed. Review the details.`;
  if (grade === 'A') return `Strong performance with minor corrections needed.`;
  return `Flawless. Zero infractions. Executive-level execution.`;
}

function buildTargetedLessons(
  infractions: HiddenInfraction[],
  _steps: RecipeStep[]
): Array<{
  domain: string;
  title: string;
  content: string;
  whyItMatters: string;
  triggeredBy: string;
}> {
  // Deduplicate by infraction type — one lesson per type
  const seen = new Set<string>();
  const lessons: Array<{
    domain: string;
    title: string;
    content: string;
    whyItMatters: string;
    triggeredBy: string;
  }> = [];

  for (const inf of infractions) {
    if (seen.has(inf.infraction_type)) continue;
    seen.add(inf.infraction_type);
    lessons.push({
      domain: inf.domain,
      title: formatLessonTitle(inf.infraction_type),
      content: inf.expert_approach,
      whyItMatters: inf.why_it_matters,
      triggeredBy: inf.infraction_type,
    });
  }

  return lessons;
}

function formatLessonTitle(infractionType: string): string {
  return infractionType
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

async function updateUserMastery(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  domainScores: Record<string, number>,
  infractions: HiddenInfraction[]
): Promise<void> {
  for (const [domain, score] of Object.entries(domainScores)) {
    const domainInfractions = infractions.filter(
      (i) => i.domain === domain
    ).length;

    // Upsert mastery score
    const { data: existing } = await supabase
      .from('user_mastery')
      .select('*')
      .eq('user_id', userId)
      .eq('domain', domain)
      .single();

    if (existing) {
      const recentScores = [...(existing.recent_scores || []), score].slice(-10);
      const avg =
        recentScores.reduce((a: number, b: number) => a + b, 0) /
        recentScores.length;
      const prevAvg =
        existing.recent_scores?.length > 0
          ? existing.recent_scores.reduce((a: number, b: number) => a + b, 0) /
            existing.recent_scores.length
          : avg;

      const trend =
        avg > prevAvg + 2 ? 'improving' : avg < prevAvg - 2 ? 'declining' : 'stable';

      await supabase
        .from('user_mastery')
        .update({
          score: Math.round(avg * 100) / 100,
          infraction_count: existing.infraction_count + domainInfractions,
          trend,
          recent_scores: recentScores,
          challenges_in_domain: existing.challenges_in_domain + 1,
          last_updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('user_mastery').insert({
        user_id: userId,
        domain,
        score,
        infraction_count: domainInfractions,
        trend: 'stable',
        recent_scores: [score],
        challenges_in_domain: 1,
      });
    }
  }
}

async function updateEquipmentProficiency(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  equipment: string,
  grade: string
): Promise<void> {
  const isSuccess = ['A+', 'A', 'B'].includes(grade);

  const { data: existing } = await supabase
    .from('equipment_proficiency')
    .select('*')
    .eq('user_id', userId)
    .eq('equipment', equipment)
    .single();

  if (existing) {
    const updates: Record<string, unknown> = {
      last_used_at: new Date().toISOString(),
    };
    if (isSuccess) {
      updates['success_count'] = existing.success_count + 1;
      updates['proficiency'] = Math.min(100, existing.proficiency + 2);
    } else {
      updates['failure_count'] = existing.failure_count + 1;
      updates['proficiency'] = Math.max(0, existing.proficiency - 3);
    }
    await supabase
      .from('equipment_proficiency')
      .update(updates)
      .eq('id', existing.id);
  } else {
    await supabase.from('equipment_proficiency').insert({
      user_id: userId,
      equipment,
      proficiency: isSuccess ? 55 : 45,
      success_count: isSuccess ? 1 : 0,
      failure_count: isSuccess ? 0 : 1,
      last_used_at: new Date().toISOString(),
    });
  }
}
