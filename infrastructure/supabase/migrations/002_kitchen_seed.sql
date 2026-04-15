-- Kitchen training platform seed data.
-- One recipe + one challenge that mirror content-packs/kitchen/rush-hour.json
-- so the schema is executable end-to-end without the client bundle.

INSERT INTO recipes (id, slug, name, station, difficulty, target_time_seconds,
                     plating_standard, ideal_sequence, steps, critical_control_points,
                     waste_value_per_plate, allergens)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'recipe-burger-smash-v1',
  'Smash Burger',
  'flat_top',
  3,
  180,
  'Bun up, patty centered, cheese melted full cover.',
  '["wash_hands","portion_beef","season","smash","flip","cheese","toast_bun","assemble"]'::jsonb,
  '[
    {"id":"s1","order":1,"instruction":"Wash hands, glove up.","whyExplanation":"Sanitation reset before every new protein contact.","timeSeconds":10,"isCCP":true,"tools":["sink","gloves"]},
    {"id":"s4","order":4,"instruction":"Smash at 450°F for 60s.","whyExplanation":"Maillard crust at 450°F+; lower = steamed puck.","timeSeconds":60,"isCCP":true,"tools":["spatula"],"targetTemp":450},
    {"id":"s5","order":5,"instruction":"Flip; cheese on. Internal 160°F minimum.","whyExplanation":"USDA requires 160°F internal for ground beef.","timeSeconds":45,"isCCP":true,"tools":["thermometer"],"targetTemp":160}
  ]'::jsonb,
  '[
    {"id":"ccp1","stepId":"s1","type":"sanitation","target":"Hands washed within 30s of protein contact","tolerance":"zero misses","consequence":"Cross-contamination, foodborne illness lawsuit."},
    {"id":"ccp2","stepId":"s5","type":"temperature","target":"160°F internal","tolerance":"zero below","consequence":"E. coli risk."}
  ]'::jsonb,
  0.20,
  ARRAY['wheat','dairy']::TEXT[]
);

INSERT INTO challenges (id, slug, type, title, briefing, time_limit_seconds,
                        difficulty_level, hidden_domains, recipe_id, contains_traps,
                        equipment_focus, tickets, available_ingredients, is_active)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'rush-hour',
  'rush_hour',
  'Saturday 8pm Rush',
  'Five tickets. Ten minutes. Keep the line moving.',
  600,
  3,
  ARRAY['speed','sanitation','sequencing','food_safety','waste_management']::mastery_domain[],
  '11111111-1111-1111-1111-111111111111',
  TRUE,
  ARRAY['grill','flat_top']::equipment_type[],
  '[
    {"id":"tk-1","orderNumber":101,"priority":"normal","isTrapped":false,"submittedAt":0,"timeWindowSeconds":300,
     "items":[{"id":"it-1","name":"Smash Burger","recipeId":"recipe-burger-smash-v1","modifiers":[],"isImpossible":false,"quantity":1}]},
    {"id":"tk-3","orderNumber":103,"priority":"normal","isTrapped":true,"submittedAt":60000,"timeWindowSeconds":300,
     "items":[{"id":"it-3","name":"Smash Burger","recipeId":"recipe-burger-smash-v1","modifiers":["medium rare"],"isImpossible":true,
              "impossibleReason":"Ground beef must reach 160°F internal.","quantity":1}]}
  ]'::jsonb,
  '[
    {"id":"ing-beef-fresh","name":"Ground beef 80/20 (fresh)","category":"protein","receivedAt":1712000000000,"useByDate":1713500000000,"isSpoiled":false,"costPerUnit":4.5,"unit":"lb","allergens":[],"requiresRefrigeration":true},
    {"id":"ing-beef-spoiled","name":"Ground beef 80/20 (old lot)","category":"protein","receivedAt":1710000000000,"useByDate":1712100000000,"isSpoiled":true,"costPerUnit":4.5,"unit":"lb","allergens":[],"requiresRefrigeration":true}
  ]'::jsonb,
  TRUE
);
