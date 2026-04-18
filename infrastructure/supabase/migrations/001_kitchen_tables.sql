-- TopShelf Service LLC - Kitchen Training Platform Schema
-- PROPRIETARY AND CONFIDENTIAL
-- Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
--
-- Core tables for the "Solve First, Then Teach" kitchen training system.
-- Designed around event sourcing: every action is captured, every infraction
-- is silently logged, and expert standards are stored separately for comparison.

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE kitchen_role AS ENUM (
  'line_cook', 'prep_cook', 'sous_chef',
  'executive_chef', 'kitchen_manager', 'trainer'
);

CREATE TYPE kitchen_rank AS ENUM (
  'dishwasher', 'prep_cook', 'line_cook_iii', 'line_cook_ii', 'line_cook_i',
  'commis', 'demi_chef', 'chef_de_partie', 'sous_chef', 'executive_chef'
);

CREATE TYPE challenge_phase AS ENUM (
  'setup', 'solve', 'consequence', 'teach', 'verify', 'mastery', 'cooldown', 'completed'
);

CREATE TYPE challenge_type AS ENUM (
  'rush_hour', 'ghost_recipe', 'station_setup', 'temp_check',
  'inventory_scramble', 'labor_prep', 'hazard_scan', 'mock_impossible'
);

CREATE TYPE attempt_status AS ENUM (
  'solving', 'consequence', 'teaching', 'verifying', 'completed', 'abandoned', 'cooldown'
);

CREATE TYPE infraction_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE mastery_domain AS ENUM (
  'sanitation', 'food_safety', 'efficiency', 'sequencing', 'kitchen_math',
  'waste_management', 'speed', 'plating', 'judgment',
  'inventory', 'labor_cost'
);

CREATE TYPE equipment_type AS ENUM (
  'grill', 'fryer', 'oven', 'saute', 'flat_top',
  'cold_station', 'prep_table', 'expediter'
);

CREATE TYPE qr_validation_status AS ENUM ('pending', 'validated', 'failed', 'expired');

-- =============================================================================
-- KITCHEN USER PROFILES
-- =============================================================================

CREATE TABLE kitchen_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kitchen_role  kitchen_role NOT NULL DEFAULT 'line_cook',
  kitchen_rank  kitchen_rank NOT NULL DEFAULT 'dishwasher',
  station_assignment equipment_type,
  hire_date     DATE,
  can_view_team_data BOOLEAN NOT NULL DEFAULT FALSE,
  can_validate  BOOLEAN NOT NULL DEFAULT FALSE,
  organization_id UUID REFERENCES organizations(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_kitchen_profiles_user ON kitchen_profiles(user_id);
CREATE INDEX idx_kitchen_profiles_org ON kitchen_profiles(organization_id);
CREATE INDEX idx_kitchen_profiles_rank ON kitchen_profiles(kitchen_rank);

-- =============================================================================
-- RECIPES (Expert Standards)
-- =============================================================================
-- Each recipe is the canonical "how a professional does it" standard.
-- Challenge attempts are compared against these.

CREATE TABLE recipes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                VARCHAR(100) NOT NULL UNIQUE,
  name                VARCHAR(255) NOT NULL,
  station             equipment_type NOT NULL,
  difficulty          SMALLINT NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  ideal_sequence      JSONB NOT NULL DEFAULT '[]',
  steps               JSONB NOT NULL DEFAULT '[]',
  critical_control_points JSONB NOT NULL DEFAULT '[]',
  waste_value_per_plate NUMERIC(8,2) NOT NULL DEFAULT 0,
  target_time_seconds INTEGER NOT NULL,
  plating_standard    TEXT,
  ingredients         JSONB NOT NULL DEFAULT '[]',
  allergens           TEXT[] DEFAULT '{}',
  organization_id     UUID REFERENCES organizations(id),
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recipes_station ON recipes(station);
CREATE INDEX idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX idx_recipes_org ON recipes(organization_id);

-- =============================================================================
-- CHALLENGES (Template Definitions)
-- =============================================================================

CREATE TABLE challenges (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              VARCHAR(100) NOT NULL UNIQUE,
  type              challenge_type NOT NULL,
  title             VARCHAR(255) NOT NULL,
  briefing          TEXT NOT NULL,
  time_limit_seconds INTEGER NOT NULL,
  difficulty_level  SMALLINT NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
  hidden_domains    mastery_domain[] NOT NULL DEFAULT '{}',
  recipe_id         UUID REFERENCES recipes(id),
  contains_traps    BOOLEAN NOT NULL DEFAULT FALSE,
  equipment_focus   equipment_type[] DEFAULT '{}',
  tickets           JSONB DEFAULT '[]',
  available_ingredients JSONB DEFAULT '[]',
  station_layout    JSONB,
  shadow_rules      JSONB DEFAULT '[]',
  organization_id   UUID REFERENCES organizations(id),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_challenges_type ON challenges(type);
CREATE INDEX idx_challenges_recipe ON challenges(recipe_id);
CREATE INDEX idx_challenges_org ON challenges(organization_id);
CREATE INDEX idx_challenges_difficulty ON challenges(difficulty_level);

-- =============================================================================
-- ATTEMPTS (Each Challenge Run)
-- =============================================================================
-- One row per challenge attempt. Contains the full event log as JSONB.
-- Status tracks position in the SOLVE → CONSEQUENCE → TEACH → VERIFY → MASTERY pipeline.

CREATE TABLE attempts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id      UUID NOT NULL REFERENCES challenges(id),
  recipe_id         UUID REFERENCES recipes(id),
  status            attempt_status NOT NULL DEFAULT 'solving',
  event_log         JSONB NOT NULL DEFAULT '[]',
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  solve_ended_at    TIMESTAMPTZ,
  teach_started_at  TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  time_spent_seconds INTEGER,
  tickets_completed INTEGER DEFAULT 0,
  tickets_total     INTEGER DEFAULT 0,
  waste_accumulated NUMERIC(8,2) DEFAULT 0,
  is_verification   BOOLEAN NOT NULL DEFAULT FALSE,
  consecutive_failures INTEGER DEFAULT 0,
  consequence_payload JSONB,
  teach_payload     JSONB,
  domain_scores     JSONB DEFAULT '{}',
  overall_grade     VARCHAR(2),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attempts_user ON attempts(user_id);
CREATE INDEX idx_attempts_challenge ON attempts(challenge_id);
CREATE INDEX idx_attempts_status ON attempts(status);
CREATE INDEX idx_attempts_user_challenge ON attempts(user_id, challenge_id);
CREATE INDEX idx_attempts_started ON attempts(started_at DESC);

-- =============================================================================
-- HIDDEN INFRACTIONS
-- =============================================================================
-- Background-captured failures. The cook never sees these during SOLVE phase.
-- They are revealed during CONSEQUENCE/TEACH phases.

CREATE TABLE hidden_infractions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id        UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  infraction_type   VARCHAR(80) NOT NULL,
  severity          infraction_severity NOT NULL,
  domain            mastery_domain NOT NULL,
  trigger_event_id  VARCHAR(100),
  cost_impact       NUMERIC(8,2) NOT NULL DEFAULT 0,
  explanation       TEXT NOT NULL,
  why_it_matters    TEXT NOT NULL,
  expert_approach   TEXT NOT NULL,
  silent            BOOLEAN NOT NULL DEFAULT TRUE,
  detected_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_infractions_attempt ON hidden_infractions(attempt_id);
CREATE INDEX idx_infractions_user ON hidden_infractions(user_id);
CREATE INDEX idx_infractions_domain ON hidden_infractions(domain);
CREATE INDEX idx_infractions_severity ON hidden_infractions(severity);
CREATE INDEX idx_infractions_type ON hidden_infractions(infraction_type);

-- =============================================================================
-- USER MASTERY (Persistent Aggregate Scores)
-- =============================================================================
-- Rolling competency scores per domain. Updated after every challenge.
-- Some domain scores are hidden from the cook until they reach a certain rank.

CREATE TABLE user_mastery (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain            mastery_domain NOT NULL,
  score             NUMERIC(5,2) NOT NULL DEFAULT 50,
  infraction_count  INTEGER NOT NULL DEFAULT 0,
  trend             VARCHAR(20) NOT NULL DEFAULT 'stable',
  is_revealed       BOOLEAN NOT NULL DEFAULT FALSE,
  recent_scores     JSONB NOT NULL DEFAULT '[]',
  challenges_in_domain INTEGER NOT NULL DEFAULT 0,
  last_updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, domain)
);

CREATE INDEX idx_user_mastery_user ON user_mastery(user_id);
CREATE INDEX idx_user_mastery_domain ON user_mastery(domain);
CREATE INDEX idx_user_mastery_score ON user_mastery(score);

-- =============================================================================
-- EQUIPMENT PROFICIENCY
-- =============================================================================

CREATE TABLE equipment_proficiency (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  equipment       equipment_type NOT NULL,
  proficiency     NUMERIC(5,2) NOT NULL DEFAULT 50,
  failure_count   INTEGER NOT NULL DEFAULT 0,
  success_count   INTEGER NOT NULL DEFAULT 0,
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, equipment)
);

CREATE INDEX idx_equip_prof_user ON equipment_proficiency(user_id);

-- =============================================================================
-- QR VALIDATIONS (Real-World Bridge)
-- =============================================================================

CREATE TABLE qr_validations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cook_user_id    UUID NOT NULL REFERENCES users(id),
  challenge_id    UUID NOT NULL REFERENCES challenges(id),
  attempt_id      UUID REFERENCES attempts(id),
  payload         TEXT NOT NULL,
  status          qr_validation_status NOT NULL DEFAULT 'pending',
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,
  validated_by    UUID REFERENCES users(id),
  validated_at    TIMESTAMPTZ,
  validation_notes TEXT,
  passed          BOOLEAN
);

CREATE INDEX idx_qr_cook ON qr_validations(cook_user_id);
CREATE INDEX idx_qr_status ON qr_validations(status);
CREATE INDEX idx_qr_validator ON qr_validations(validated_by);

-- =============================================================================
-- DAILY SPECS (Pre-Shift Micro-Learning)
-- =============================================================================

CREATE TABLE daily_specs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID REFERENCES organizations(id),
  spec_date           DATE NOT NULL,
  station_focus       equipment_type,
  special_of_the_day  VARCHAR(255),
  challenge_id        UUID REFERENCES challenges(id),
  quick_challenge_type challenge_type,
  push_notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_daily_specs_date ON daily_specs(spec_date);
CREATE INDEX idx_daily_specs_org ON daily_specs(organization_id);

-- =============================================================================
-- COOLDOWN LOG
-- =============================================================================

CREATE TABLE cooldown_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id    UUID NOT NULL REFERENCES challenges(id),
  attempt_id      UUID REFERENCES attempts(id),
  reason          TEXT NOT NULL,
  consecutive_failures INTEGER NOT NULL,
  cooldown_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cooldown_ends_at    TIMESTAMPTZ NOT NULL,
  resumed_at      TIMESTAMPTZ
);

CREATE INDEX idx_cooldown_user ON cooldown_log(user_id);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

ALTER TABLE kitchen_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hidden_infractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_proficiency ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooldown_log ENABLE ROW LEVEL SECURITY;

-- Kitchen Profiles: users see own, managers/chefs see team
CREATE POLICY kitchen_profiles_own ON kitchen_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY kitchen_profiles_team ON kitchen_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM kitchen_profiles kp
      WHERE kp.user_id = auth.uid()
        AND kp.kitchen_role IN ('executive_chef', 'kitchen_manager', 'trainer', 'sous_chef')
        AND kp.organization_id = kitchen_profiles.organization_id
    )
  );

CREATE POLICY kitchen_profiles_insert ON kitchen_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY kitchen_profiles_update ON kitchen_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Recipes: anyone can read published recipes in their org
CREATE POLICY recipes_read ON recipes
  FOR SELECT USING (
    organization_id IS NULL
    OR EXISTS (
      SELECT 1 FROM kitchen_profiles kp
      WHERE kp.user_id = auth.uid() AND kp.organization_id = recipes.organization_id
    )
  );

CREATE POLICY recipes_manage ON recipes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM kitchen_profiles kp
      WHERE kp.user_id = auth.uid()
        AND kp.kitchen_role IN ('executive_chef', 'kitchen_manager', 'trainer')
    )
  );

-- Challenges: anyone can read active challenges
CREATE POLICY challenges_read ON challenges
  FOR SELECT USING (
    is_active = TRUE AND (
      organization_id IS NULL
      OR EXISTS (
        SELECT 1 FROM kitchen_profiles kp
        WHERE kp.user_id = auth.uid() AND kp.organization_id = challenges.organization_id
      )
    )
  );

-- Attempts: cooks see ONLY their own (privacy-first)
CREATE POLICY attempts_own ON attempts
  FOR ALL USING (auth.uid() = user_id);

-- Managers can VIEW (not modify) team attempts
CREATE POLICY attempts_team_read ON attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM kitchen_profiles manager
      JOIN kitchen_profiles cook ON cook.user_id = attempts.user_id
      WHERE manager.user_id = auth.uid()
        AND manager.kitchen_role IN ('executive_chef', 'kitchen_manager', 'trainer')
        AND manager.organization_id = cook.organization_id
    )
  );

-- Hidden Infractions: cooks see ONLY their own (peer visibility blocked)
CREATE POLICY infractions_own ON hidden_infractions
  FOR SELECT USING (auth.uid() = user_id);

-- Managers can view team infractions
CREATE POLICY infractions_team_read ON hidden_infractions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM kitchen_profiles manager
      JOIN kitchen_profiles cook ON cook.user_id = hidden_infractions.user_id
      WHERE manager.user_id = auth.uid()
        AND manager.kitchen_role IN ('executive_chef', 'kitchen_manager', 'trainer')
        AND manager.organization_id = cook.organization_id
    )
  );

-- Service role can insert infractions (from Edge Functions)
CREATE POLICY infractions_service_insert ON hidden_infractions
  FOR INSERT WITH CHECK (TRUE);

-- User Mastery: own data only
CREATE POLICY mastery_own ON user_mastery
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY mastery_team_read ON user_mastery
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM kitchen_profiles manager
      JOIN kitchen_profiles cook ON cook.user_id = user_mastery.user_id
      WHERE manager.user_id = auth.uid()
        AND manager.kitchen_role IN ('executive_chef', 'kitchen_manager', 'trainer')
        AND manager.organization_id = cook.organization_id
    )
  );

-- Equipment Proficiency: own data
CREATE POLICY equip_prof_own ON equipment_proficiency
  FOR ALL USING (auth.uid() = user_id);

-- QR Validations: cook sees own, validators see pending
CREATE POLICY qr_cook_own ON qr_validations
  FOR SELECT USING (auth.uid() = cook_user_id);

CREATE POLICY qr_validator_read ON qr_validations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM kitchen_profiles kp
      WHERE kp.user_id = auth.uid() AND kp.can_validate = TRUE
    )
  );

CREATE POLICY qr_validator_update ON qr_validations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM kitchen_profiles kp
      WHERE kp.user_id = auth.uid() AND kp.can_validate = TRUE
    )
  );

-- Daily Specs: all in org can read
CREATE POLICY daily_specs_read ON daily_specs
  FOR SELECT USING (
    organization_id IS NULL
    OR EXISTS (
      SELECT 1 FROM kitchen_profiles kp
      WHERE kp.user_id = auth.uid() AND kp.organization_id = daily_specs.organization_id
    )
  );

-- Cooldown Log: own data
CREATE POLICY cooldown_own ON cooldown_log
  FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kitchen_profiles_updated
  BEFORE UPDATE ON kitchen_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_recipes_updated
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_challenges_updated
  BEFORE UPDATE ON challenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to calculate rank from total mastery points
CREATE OR REPLACE FUNCTION calculate_kitchen_rank(total_points NUMERIC)
RETURNS kitchen_rank AS $$
BEGIN
  IF total_points >= 5500 THEN RETURN 'executive_chef';
  ELSIF total_points >= 4000 THEN RETURN 'sous_chef';
  ELSIF total_points >= 3000 THEN RETURN 'chef_de_partie';
  ELSIF total_points >= 2200 THEN RETURN 'demi_chef';
  ELSIF total_points >= 1500 THEN RETURN 'commis';
  ELSIF total_points >= 1000 THEN RETURN 'line_cook_i';
  ELSIF total_points >= 600 THEN RETURN 'line_cook_ii';
  ELSIF total_points >= 300 THEN RETURN 'line_cook_iii';
  ELSIF total_points >= 100 THEN RETURN 'prep_cook';
  ELSE RETURN 'dishwasher';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update user rank after mastery changes
CREATE OR REPLACE FUNCTION update_user_rank()
RETURNS TRIGGER AS $$
DECLARE
  total_score NUMERIC;
  new_rank kitchen_rank;
BEGIN
  SELECT COALESCE(SUM(score), 0) INTO total_score
  FROM user_mastery
  WHERE user_id = NEW.user_id;

  new_rank := calculate_kitchen_rank(total_score);

  UPDATE kitchen_profiles
  SET kitchen_rank = new_rank, updated_at = NOW()
  WHERE user_id = NEW.user_id AND kitchen_rank IS DISTINCT FROM new_rank;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_rank_on_mastery
  AFTER INSERT OR UPDATE ON user_mastery
  FOR EACH ROW EXECUTE FUNCTION update_user_rank();
