-- Kitchen training platform seed data.
-- Eight recipes + eight challenges mirroring content-packs/kitchen/*.json
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

-- =====================================================================
-- Recipe: Temperature Logging Standard
-- =====================================================================
INSERT INTO recipes (id, slug, name, station, difficulty, target_time_seconds,
                     plating_standard, ideal_sequence, steps, critical_control_points,
                     waste_value_per_plate, allergens)
VALUES (
  '22222222-0000-0000-0000-000000000002',
  'recipe-temp-standard-v1',
  'Temperature Logging Standard',
  'cold_station', 2, 120,
  'All four stations logged within range. Zero readings in the danger zone.',
  '["calibrate_thermometer","walk_in","freezer","hot_hold","line_reach","log_results"]'::jsonb,
  '[{"id":"t1","order":1,"instruction":"Calibrate thermometer in ice bath (32F).","whyExplanation":"An uncalibrated thermometer can read 10F off.","timeSeconds":15,"isCCP":true,"tools":["thermometer","ice_bath"]},
    {"id":"t2","order":2,"instruction":"Walk-in cooler: confirm 33-40F.","whyExplanation":"Above 40F bacteria double every 20 minutes.","timeSeconds":20,"isCCP":true,"tools":["thermometer"],"targetTemp":38},
    {"id":"t3","order":3,"instruction":"Freezer: confirm 0F or below.","whyExplanation":"Freezer above 0F allows slow bacterial growth.","timeSeconds":20,"isCCP":true,"tools":["thermometer"],"targetTemp":-5},
    {"id":"t4","order":4,"instruction":"Hot hold: confirm 140F or above.","whyExplanation":"Below 140F food enters the danger zone.","timeSeconds":20,"isCCP":true,"tools":["thermometer"],"targetTemp":150},
    {"id":"t5","order":5,"instruction":"Line reach-in: confirm 33-40F.","whyExplanation":"Reach-ins hold prepped proteins for service.","timeSeconds":20,"isCCP":true,"tools":["thermometer"],"targetTemp":38}]'::jsonb,
  '[{"id":"ccp-cal","stepId":"t1","type":"sanitation","target":"Thermometer reads 32F in ice bath","tolerance":"+/- 2F","consequence":"All subsequent readings untrustworthy."},
    {"id":"ccp-dz","stepId":"t4","type":"temperature","target":"Hot hold above 140F","tolerance":"zero below","consequence":"Food in danger zone must be discarded after 2 hours."}]'::jsonb,
  0, ARRAY[]::TEXT[]
);

INSERT INTO challenges (id, slug, type, title, briefing, time_limit_seconds,
                        difficulty_level, hidden_domains, recipe_id, contains_traps,
                        equipment_focus, tickets, available_ingredients, is_active)
VALUES (
  '33333333-0000-0000-0000-000000000002',
  'temp-check', 'temp_check', 'Temp Check Challenge',
  'Walk-in, reach-in, hot hold, cold hold. Record every temp.',
  180, 2,
  ARRAY['food_safety','sanitation','judgment']::mastery_domain[],
  '22222222-0000-0000-0000-000000000002', TRUE,
  ARRAY['cold_station']::equipment_type[],
  '[]'::jsonb, '[]'::jsonb, TRUE
);

-- =====================================================================
-- Recipe: Brunch Station Setup
-- =====================================================================
INSERT INTO recipes (id, slug, name, station, difficulty, target_time_seconds,
                     plating_standard, ideal_sequence, steps, critical_control_points,
                     waste_value_per_plate, allergens)
VALUES (
  '22222222-0000-0000-0000-000000000003',
  'recipe-brunch-setup-v1',
  'Brunch Station Setup',
  'prep_table', 2, 150,
  'All 8 positions filled, hot/cold separation maintained.',
  '["wash_hands","sani_bucket","cold_rail","hot_zone","prep_tools","final_check"]'::jsonb,
  '[{"id":"ss1","order":1,"instruction":"Wash hands, glove up.","whyExplanation":"Sanitation reset.","timeSeconds":10,"isCCP":true,"tools":["sink","gloves"]},
    {"id":"ss2","order":2,"instruction":"Place sani bucket with fresh solution.","whyExplanation":"Fresh solution every 2 hours.","timeSeconds":15,"isCCP":true,"tools":["sani-bucket"]},
    {"id":"ss3","order":3,"instruction":"Stock cold rail at 40F or below.","whyExplanation":"Cold items warm immediately outside walk-in.","timeSeconds":40,"isCCP":false,"tools":["sheet_pan"]},
    {"id":"ss4","order":4,"instruction":"Set hot zone tools in reach order.","whyExplanation":"Reaching across hot surfaces causes burns.","timeSeconds":30,"isCCP":false,"tools":["tongs","spatula"]},
    {"id":"ss5","order":5,"instruction":"Prep area: knife, board, muffins.","whyExplanation":"Every step away costs 3-5s per ticket.","timeSeconds":25,"isCCP":false,"tools":["chef-knife","cutting_board"]}]'::jsonb,
  '[{"id":"ccp-sani","stepId":"ss2","type":"sanitation","target":"Fresh sani solution","tolerance":"zero old solution","consequence":"Cross-contamination on every wiped surface."}]'::jsonb,
  0, ARRAY[]::TEXT[]
);

INSERT INTO challenges (id, slug, type, title, briefing, time_limit_seconds,
                        difficulty_level, hidden_domains, recipe_id, contains_traps,
                        equipment_focus, tickets, available_ingredients, is_active)
VALUES (
  '33333333-0000-0000-0000-000000000003',
  'station-setup', 'station_setup', 'Pre-Brunch Mise en Place',
  'Before service hits, set your station.',
  180, 2,
  ARRAY['sequencing','efficiency','sanitation']::mastery_domain[],
  '22222222-0000-0000-0000-000000000003', FALSE,
  ARRAY['cold_station','prep_table']::equipment_type[],
  '[]'::jsonb, '[]'::jsonb, TRUE
);

-- =====================================================================
-- Recipe: Hollandaise (Scaled)
-- =====================================================================
INSERT INTO recipes (id, slug, name, station, difficulty, target_time_seconds,
                     plating_standard, ideal_sequence, steps, critical_control_points,
                     waste_value_per_plate, allergens)
VALUES (
  '22222222-0000-0000-0000-000000000004',
  'recipe-hollandaise-v1',
  'Hollandaise (Scaled)',
  'saute', 3, 150,
  'Smooth emulsion, no breaking, correct yield for cover count.',
  '["calculate_yield","scale_eggs","scale_butter","scale_acid","execute"]'::jsonb,
  '[{"id":"g1","order":1,"instruction":"Calculate new yield: 28/12 = 2.33x.","whyExplanation":"Wrong multiplier cascades.","timeSeconds":20,"isCCP":false,"tools":[]},
    {"id":"g2","order":2,"instruction":"Scale egg yolks: 6 x 2.33 = 14.","whyExplanation":"Eggs are the emulsifier.","timeSeconds":15,"isCCP":false,"tools":["scale"]},
    {"id":"g3","order":3,"instruction":"Scale butter: 1.5 lb x 2.33 = 3.5 lb.","whyExplanation":"Under-scaling = short portions.","timeSeconds":15,"isCCP":false,"tools":["scale"]},
    {"id":"g4","order":4,"instruction":"Scale acid: 2 oz x 2.33 = 4.5 oz.","whyExplanation":"Over-acidifying ruins 28 plates.","timeSeconds":15,"isCCP":false,"tools":["measuring_cup"]},
    {"id":"g5","order":5,"instruction":"Execute: temper yolks, stream butter at 145F, hold at 140F.","whyExplanation":"Below 140F = danger zone.","timeSeconds":60,"isCCP":true,"tools":["double_boiler","thermometer"],"targetTemp":145}]'::jsonb,
  '[{"id":"ccp-hold","stepId":"g5","type":"temperature","target":"Hold at 140F+","tolerance":"zero below 140F","consequence":"Bacteria grows rapidly in hollandaise below 140F."}]'::jsonb,
  0.85, ARRAY['egg','dairy']::TEXT[]
);

INSERT INTO challenges (id, slug, type, title, briefing, time_limit_seconds,
                        difficulty_level, hidden_domains, recipe_id, contains_traps,
                        equipment_focus, tickets, available_ingredients, is_active)
VALUES (
  '33333333-0000-0000-0000-000000000004',
  'ghost-recipe', 'ghost_recipe', 'Double the Recipe',
  'Party of 12 became 28. Scale the hollandaise, right now.',
  180, 3,
  ARRAY['kitchen_math','judgment','efficiency']::mastery_domain[],
  '22222222-0000-0000-0000-000000000004', FALSE,
  ARRAY['saute']::equipment_type[],
  '[]'::jsonb, '[]'::jsonb, TRUE
);

-- =====================================================================
-- Recipe: Walk-In FIFO Standard
-- =====================================================================
INSERT INTO recipes (id, slug, name, station, difficulty, target_time_seconds,
                     plating_standard, ideal_sequence, steps, critical_control_points,
                     waste_value_per_plate, allergens)
VALUES (
  '22222222-0000-0000-0000-000000000005',
  'recipe-walkin-org-v1',
  'Walk-In FIFO Standard',
  'cold_station', 2, 200,
  'Oldest product in front, all items dated, spoiled product pulled.',
  '["glove_up","pull_spoiled","date_new","rotate_old_forward","new_to_back","check_temps"]'::jsonb,
  '[{"id":"inv1","order":1,"instruction":"Glove up.","whyExplanation":"Bare hands = cross-contamination.","timeSeconds":10,"isCCP":true,"tools":["gloves","marker"]},
    {"id":"inv2","order":2,"instruction":"Pull any product past use-by.","whyExplanation":"Expired product contaminates the shelf.","timeSeconds":40,"isCCP":true,"tools":[]},
    {"id":"inv3","order":3,"instruction":"Date-label all new delivery items.","whyExplanation":"Undated product makes FIFO impossible.","timeSeconds":30,"isCCP":false,"tools":["marker","labels"]},
    {"id":"inv4","order":4,"instruction":"Rotate existing stock to front.","whyExplanation":"FIFO: First In, First Out.","timeSeconds":40,"isCCP":false,"tools":[]},
    {"id":"inv5","order":5,"instruction":"Place new delivery behind existing.","whyExplanation":"New behind old ensures correct use order.","timeSeconds":30,"isCCP":false,"tools":[]}]'::jsonb,
  '[{"id":"ccp-spoil","stepId":"inv2","type":"sanitation","target":"All expired product removed","tolerance":"zero expired","consequence":"Serving expired product is a health code violation."}]'::jsonb,
  0, ARRAY[]::TEXT[]
);

INSERT INTO challenges (id, slug, type, title, briefing, time_limit_seconds,
                        difficulty_level, hidden_domains, recipe_id, contains_traps,
                        equipment_focus, tickets, available_ingredients, is_active)
VALUES (
  '33333333-0000-0000-0000-000000000005',
  'inventory-scramble', 'inventory_scramble', 'Walk-In FIFO Scramble',
  'Truck came in. Produce jammed in front of last week stock.',
  240, 2,
  ARRAY['inventory','waste_management','sanitation','food_safety']::mastery_domain[],
  '22222222-0000-0000-0000-000000000005', TRUE,
  ARRAY['cold_station']::equipment_type[],
  '[]'::jsonb, '[]'::jsonb, TRUE
);

-- =====================================================================
-- Recipe: Prep Schedule Standard
-- =====================================================================
INSERT INTO recipes (id, slug, name, station, difficulty, target_time_seconds,
                     plating_standard, ideal_sequence, steps, critical_control_points,
                     waste_value_per_plate, allergens)
VALUES (
  '22222222-0000-0000-0000-000000000006',
  'recipe-labor-plan-v1',
  'Prep Schedule Standard',
  'prep_table', 4, 240,
  'All 8 tasks assigned, no cook idle, total labor under budget.',
  '["assess_tasks","assign_proteins_first","assign_sauces","assign_cold_prep","assign_dry_prep","verify_timeline"]'::jsonb,
  '[{"id":"lp1","order":1,"instruction":"Assess all 8 tasks.","whyExplanation":"Wrong assignment wastes labor.","timeSeconds":30,"isCCP":false,"tools":[]},
    {"id":"lp2","order":2,"instruction":"Assign protein prep first.","whyExplanation":"Longest lead time.","timeSeconds":40,"isCCP":false,"tools":[]},
    {"id":"lp3","order":3,"instruction":"Assign sauces and stocks.","whyExplanation":"Sauces need time to reduce.","timeSeconds":40,"isCCP":false,"tools":[]},
    {"id":"lp4","order":4,"instruction":"Assign cold prep last.","whyExplanation":"Cold items done early wilt.","timeSeconds":30,"isCCP":false,"tools":[]},
    {"id":"lp5","order":5,"instruction":"Verify no double-booking.","whyExplanation":"Overlapping = neglected task.","timeSeconds":20,"isCCP":false,"tools":[]}]'::jsonb,
  '[{"id":"ccp-labor","stepId":"lp1","type":"time","target":"Total labor under budget","tolerance":"zero overtime","consequence":"Unplanned overtime at $27/hr erodes margins."}]'::jsonb,
  0, ARRAY[]::TEXT[]
);

INSERT INTO challenges (id, slug, type, title, briefing, time_limit_seconds,
                        difficulty_level, hidden_domains, recipe_id, contains_traps,
                        equipment_focus, tickets, available_ingredients, is_active)
VALUES (
  '33333333-0000-0000-0000-000000000006',
  'labor-prep', 'labor_prep', 'Sous Chef: Schedule the Line',
  'Four cooks. Eight prep tasks. Two hours until doors open.',
  300, 4,
  ARRAY['labor_cost','sequencing','efficiency','judgment']::mastery_domain[],
  '22222222-0000-0000-0000-000000000006', FALSE,
  ARRAY['prep_table']::equipment_type[],
  '[]'::jsonb, '[]'::jsonb, TRUE
);

-- =====================================================================
-- Recipe: Kitchen Safety Walkthrough
-- =====================================================================
INSERT INTO recipes (id, slug, name, station, difficulty, target_time_seconds,
                     plating_standard, ideal_sequence, steps, critical_control_points,
                     waste_value_per_plate, allergens)
VALUES (
  '22222222-0000-0000-0000-000000000007',
  'recipe-osha-standard-v1',
  'Kitchen Safety Walkthrough',
  'prep_table', 2, 60,
  'All hazards identified, corrective actions noted.',
  '["scan_floors","scan_exits","scan_equipment","scan_storage","report"]'::jsonb,
  '[{"id":"hz1","order":1,"instruction":"Scan floors for wet spots and debris.","whyExplanation":"Slips are #1 kitchen injury.","timeSeconds":15,"isCCP":true,"tools":[]},
    {"id":"hz2","order":2,"instruction":"Check all exits unblocked.","whyExplanation":"Blocked exits violate fire code.","timeSeconds":10,"isCCP":true,"tools":[]},
    {"id":"hz3","order":3,"instruction":"Verify fire extinguisher charged.","whyExplanation":"Expired extinguisher = no extinguisher.","timeSeconds":10,"isCCP":true,"tools":[]},
    {"id":"hz4","order":4,"instruction":"Check knife storage.","whyExplanation":"Loose knives cause lacerations.","timeSeconds":10,"isCCP":false,"tools":[]}]'::jsonb,
  '[{"id":"ccp-exit","stepId":"hz2","type":"sanitation","target":"All exits clear","tolerance":"zero blocked","consequence":"OSHA fine up to $15,625. Fire marshal can close the kitchen."}]'::jsonb,
  0, ARRAY[]::TEXT[]
);

INSERT INTO challenges (id, slug, type, title, briefing, time_limit_seconds,
                        difficulty_level, hidden_domains, recipe_id, contains_traps,
                        equipment_focus, tickets, available_ingredients, is_active)
VALUES (
  '33333333-0000-0000-0000-000000000007',
  'hazard-scan', 'hazard_scan', 'Clock-In Hazard Scan',
  'Eyeball the kitchen. Tap every hazard you see.',
  90, 2,
  ARRAY['judgment','sanitation']::mastery_domain[],
  '22222222-0000-0000-0000-000000000007', TRUE,
  ARRAY['prep_table']::equipment_type[],
  '[]'::jsonb, '[]'::jsonb, TRUE
);

-- =====================================================================
-- Recipe: Order Safety Review
-- =====================================================================
INSERT INTO recipes (id, slug, name, station, difficulty, target_time_seconds,
                     plating_standard, ideal_sequence, steps, critical_control_points,
                     waste_value_per_plate, allergens)
VALUES (
  '22222222-0000-0000-0000-000000000008',
  'recipe-order-review-v1',
  'Order Safety Review',
  'prep_table', 4, 90,
  'All impossible items identified and rejected. Safe items fired.',
  '["read_ticket","check_each_item","flag_impossible","reject_unsafe","fire_safe"]'::jsonb,
  '[{"id":"or1","order":1,"instruction":"Read the full ticket first.","whyExplanation":"Firing before reading wastes product.","timeSeconds":10,"isCCP":false,"tools":[]},
    {"id":"or2","order":2,"instruction":"Check each modifier against safety rules.","whyExplanation":"The cook is the last line of defense.","timeSeconds":20,"isCCP":true,"tools":[]},
    {"id":"or3","order":3,"instruction":"Reject impossible items, notify FOH.","whyExplanation":"Serving unsafe food creates lawsuits.","timeSeconds":15,"isCCP":true,"tools":[]},
    {"id":"or4","order":4,"instruction":"Fire the safe items normally.","whyExplanation":"Don't hold safe items for unsafe ones.","timeSeconds":30,"isCCP":false,"tools":[]}]'::jsonb,
  '[{"id":"ccp-reject","stepId":"or3","type":"sanitation","target":"All impossible items rejected","tolerance":"zero unsafe served","consequence":"Medium-rare pork = trichinosis risk. Cross-contact = anaphylaxis."}]'::jsonb,
  0, ARRAY[]::TEXT[]
);

INSERT INTO challenges (id, slug, type, title, briefing, time_limit_seconds,
                        difficulty_level, hidden_domains, recipe_id, contains_traps,
                        equipment_focus, tickets, available_ingredients, is_active)
VALUES (
  '33333333-0000-0000-0000-000000000008',
  'mock-impossible', 'mock_impossible', 'The Karen Order',
  'A ticket just landed. Read it twice. Some of it is literally impossible.',
  120, 4,
  ARRAY['judgment','food_safety','sanitation']::mastery_domain[],
  '22222222-0000-0000-0000-000000000008', TRUE,
  ARRAY['prep_table']::equipment_type[],
  '[{"id":"imp-1","orderNumber":666,"items":[{"id":"im-1","name":"Medium-Rare Pork Belly","recipeId":"r-pork","modifiers":["medium rare"],"isImpossible":true,"impossibleReason":"Pork must reach 145F per FDA.","quantity":1},{"id":"im-2","name":"Gluten-Free Pasta Bowl","recipeId":"r-pasta","modifiers":["gluten-free","shared water"],"isImpossible":true,"impossibleReason":"Cross-contact voids gluten-free claim.","quantity":1},{"id":"im-3","name":"Caesar Salad","recipeId":"r-caesar","modifiers":["vegan","no anchovy","no egg","no cheese"],"isImpossible":false,"quantity":1}],"submittedAt":0,"priority":"vip","isTrapped":true,"timeWindowSeconds":120}]'::jsonb,
  '[]'::jsonb, TRUE
);
