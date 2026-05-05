-- Uncle Julio's content pack seed data.
-- Six challenges + six recipes mirroring content-packs/kitchen/uj-*.json
-- so the schema is executable end-to-end without the client bundle.

-- =====================================================================
-- Recipe: Mesquite-Grilled Chicken Fajitas
-- =====================================================================
INSERT INTO recipes (id, slug, name, station, difficulty, target_time_seconds,
                     plating_standard, ideal_sequence, steps, critical_control_points,
                     waste_value_per_plate, allergens)
VALUES (
  '44444444-0000-0000-0000-000000000001',
  'recipe-uj-chicken-fajita-v1',
  'Mesquite-Grilled Chicken Fajitas',
  'grill', 3, 900,
  'Chicken sliced against the grain, fanned on cast-iron sizzle platter. Sizzle platter smoking when it hits the table.',
  '["wash_hands","pull_protein_fifo","check_grill_temp","season_chicken","grill_presentation_side","rotate_marks","flip_to_cool_zone","temp_check_165","rest_3min","slice_against_grain","grill_vegetables","plate_sizzle_platter"]'::jsonb,
  '[{"id":"uf1","order":1,"instruction":"Wash hands, glove up. Fresh gloves for raw protein.","whyExplanation":"Cross-contamination from grill handles.","timeSeconds":10,"isCCP":true,"tools":["sink","gloves"]},
    {"id":"uf2","order":2,"instruction":"Pull marinated chicken from walk-in. FIFO — oldest non-spoiled lot.","whyExplanation":"Older lot must be used first to prevent waste. Never grab the back-of-cooler mystery tray.","timeSeconds":15,"isCCP":false,"tools":["tongs"]},
    {"id":"uf3","order":3,"instruction":"Mesquite ember bed 450-550°F.","whyExplanation":"Below 450°F chicken steams; above 550°F marinade burns.","timeSeconds":10,"isCCP":true,"tools":["thermometer"],"targetTemp":500,"tempRange":{"min":450,"max":550}},
    {"id":"uf4","order":4,"instruction":"Season chicken lightly — marinade carries most flavor.","whyExplanation":"Over-seasoning marinated protein doubles the salt.","timeSeconds":10,"isCCP":false,"tools":[]},
    {"id":"uf5","order":5,"instruction":"Place chicken presentation-side down on hottest zone. Do not move for 3 minutes.","whyExplanation":"Moving the protein breaks the sear. Three uninterrupted minutes creates signature char lines.","timeSeconds":180,"isCCP":false,"tools":["tongs"]},
    {"id":"uf6","order":6,"instruction":"Rotate 90° for crosshatch marks. Two more minutes.","whyExplanation":"Crosshatch marks signal professional technique. Also distributes heat more evenly.","timeSeconds":120,"isCCP":false,"tools":["tongs"]},
    {"id":"uf7","order":7,"instruction":"Flip to cooler zone. Cook until internal temp reaches 165°F.","whyExplanation":"USDA Salmonella kill threshold. Thermometer is the only authority.","timeSeconds":180,"isCCP":true,"tools":["tongs","thermometer"],"targetTemp":165,"tempRange":{"min":165,"max":180}},
    {"id":"uf8","order":8,"instruction":"Rest 3 minutes on cutting board.","whyExplanation":"Juices redistribute; slicing immediately makes dry fajitas.","timeSeconds":180,"isCCP":false,"tools":["cutting_board"]},
    {"id":"uf9","order":9,"instruction":"Slice against the grain in 1/4-inch strips.","whyExplanation":"Cutting with the grain makes chewy strips. Against the grain shortens muscle fibers.","timeSeconds":30,"isCCP":false,"tools":["chef_knife","cutting_board"]},
    {"id":"uf10","order":10,"instruction":"Grill peppers and onions on hottest zone. Char edges, keep crisp center.","whyExplanation":"Overcooked vegetables turn mushy and watery on the platter.","timeSeconds":120,"isCCP":false,"tools":["tongs"]},
    {"id":"uf11","order":11,"instruction":"Fan sliced chicken on pre-heated cast-iron sizzle platter. Add vegetables. Send immediately.","whyExplanation":"Cold platter kills the signature presentation.","timeSeconds":30,"isCCP":false,"tools":["sizzle_platter"]}]'::jsonb,
  '[{"id":"ccp-uj-hands","stepId":"uf1","type":"sanitation","target":"Hands washed before raw protein","tolerance":"zero misses","consequence":"Cross-contamination foodborne illness."},
    {"id":"ccp-uj-chicken-temp","stepId":"uf7","type":"temperature","target":"Chicken 165°F","tolerance":"zero below","consequence":"Salmonella survival, health department investigation."}]'::jsonb,
  1.10, ARRAY[]::TEXT[]
);

INSERT INTO challenges (id, slug, type, title, briefing, time_limit_seconds,
                        difficulty_level, hidden_domains, recipe_id, contains_traps,
                        equipment_focus, tickets, available_ingredients, is_active)
VALUES (
  '55555555-0000-0000-0000-000000000001',
  'uj-fajita-rush', 'rush_hour', 'Uncle Julio''s: Fajita Rush',
  'Friday night. Five fajita tickets. Mesquite grill at 500°F. Move.',
  600, 3,
  ARRAY['speed','sanitation','food_safety','sequencing','waste_management']::mastery_domain[],
  '44444444-0000-0000-0000-000000000001', TRUE,
  ARRAY['grill']::equipment_type[],
  '[{"id":"uj-tk-1","orderNumber":301,"priority":"normal","isTrapped":false,"submittedAt":0,"timeWindowSeconds":360,"items":[{"id":"uj-it-1","name":"Chicken Fajitas for 2","recipeId":"recipe-uj-chicken-fajita-v1","modifiers":[],"isImpossible":false,"quantity":2}]},
    {"id":"uj-tk-2","orderNumber":302,"priority":"rush","isTrapped":false,"submittedAt":30000,"timeWindowSeconds":300,"items":[{"id":"uj-it-2","name":"Steak Fajitas","recipeId":"recipe-uj-steak-fajita-v1","modifiers":["medium"],"isImpossible":false,"quantity":1}]},
    {"id":"uj-tk-3","orderNumber":303,"priority":"normal","isTrapped":true,"submittedAt":60000,"timeWindowSeconds":300,"items":[{"id":"uj-it-3","name":"Chicken Fajitas","recipeId":"recipe-uj-chicken-fajita-v1","modifiers":["medium rare"],"isImpossible":true,"impossibleReason":"Chicken must reach 165°F; medium rare leaves Salmonella alive.","quantity":1}]},
    {"id":"uj-tk-4","orderNumber":304,"priority":"normal","isTrapped":false,"submittedAt":120000,"timeWindowSeconds":360,"items":[{"id":"uj-it-4a","name":"Chicken Fajitas","recipeId":"recipe-uj-chicken-fajita-v1","modifiers":[],"isImpossible":false,"quantity":1},{"id":"uj-it-4b","name":"Shrimp Fajitas","recipeId":"recipe-uj-shrimp-fajita-v1","modifiers":[],"isImpossible":false,"quantity":1}]},
    {"id":"uj-tk-5","orderNumber":305,"priority":"vip","isTrapped":false,"submittedAt":180000,"timeWindowSeconds":300,"items":[{"id":"uj-it-5","name":"Steak Fajitas for 2","recipeId":"recipe-uj-steak-fajita-v1","modifiers":["extra peppers"],"isImpossible":false,"quantity":2}]}]'::jsonb,
  '[{"id":"uj-ing-chicken-fresh","name":"Marinated chicken (Tuesday lot)","category":"protein","receivedAt":1712534400000,"useByDate":1713312000000,"isSpoiled":false,"costPerUnit":3.25,"unit":"lb","allergens":[],"requiresRefrigeration":true},
    {"id":"uj-ing-chicken-spoiled","name":"Marinated chicken (old lot)","category":"protein","receivedAt":1711497600000,"useByDate":1712448000000,"isSpoiled":true,"costPerUnit":3.25,"unit":"lb","allergens":[],"requiresRefrigeration":true},
    {"id":"uj-ing-shrimp","name":"Gulf shrimp 16/20","category":"protein","receivedAt":1712620800000,"useByDate":1713052800000,"isSpoiled":false,"costPerUnit":12.00,"unit":"lb","allergens":["shellfish"],"requiresRefrigeration":true}]'::jsonb,
  TRUE
);

-- =====================================================================
-- Recipe: Uncle Julio's Cheese & Onion Enchiladas
-- =====================================================================
INSERT INTO recipes (id, slug, name, station, difficulty, target_time_seconds,
                     plating_standard, ideal_sequence, steps, critical_control_points,
                     waste_value_per_plate, allergens)
VALUES (
  '44444444-0000-0000-0000-000000000002',
  'recipe-uj-cheese-enchilada-v1',
  'Uncle Julio''s Cheese & Onion Enchiladas',
  'oven', 4, 660,
  'Two enchiladas per plate, seam-side down, sauce ladled evenly, cheese bubbly.',
  '["wash_hands","heat_sauce","soften_tortilla","fill_and_roll","place_seam_down","ladle_sauce","top_with_cheese","bake_400f","garnish_and_plate"]'::jsonb,
  '[{"id":"ue1","order":1,"instruction":"Wash hands, glove up.","whyExplanation":"Tortillas go straight to the guest.","timeSeconds":10,"isCCP":true,"tools":["sink","gloves"]},
    {"id":"ue2","order":2,"instruction":"Heat salsa carne to 180°F. Stir to prevent scorching.","whyExplanation":"Cold sauce drops plate into danger zone. Scorched sauce gets sent back.","timeSeconds":30,"isCCP":true,"tools":["sauce_pot","thermometer"],"targetTemp":180,"tempRange":{"min":170,"max":195}},
    {"id":"ue3","order":3,"instruction":"Soften corn tortilla on flat top or in hot oil for 5 seconds per side.","whyExplanation":"Cold corn tortilla cracks when rolled. Cracked tortilla = filling leaks in oven.","timeSeconds":15,"isCCP":false,"tools":["flat_top","tongs"]},
    {"id":"ue4","order":4,"instruction":"Fill with 2 oz cheese blend and diced onion. Roll tight, seam down.","whyExplanation":"Loose roll means the enchilada unravels in the oven. Seam down traps the filling.","timeSeconds":20,"isCCP":false,"tools":["portion_scoop"]},
    {"id":"ue5","order":5,"instruction":"Ladle 3 oz sauce over each enchilada. Top with 1 oz shredded cheese.","whyExplanation":"Under-saucing dries out the tortilla. Over-saucing drowns the filling.","timeSeconds":15,"isCCP":false,"tools":["ladle"]},
    {"id":"ue6","order":6,"instruction":"Bake at 400°F for 8-10 minutes until cheese is bubbly and edges crisp.","whyExplanation":"Under 8 min cheese unmelted; over 10 tortillas burn. Watch the oven.","timeSeconds":540,"isCCP":true,"tools":["oven","timer"],"targetTemp":400,"tempRange":{"min":375,"max":425}},
    {"id":"ue7","order":7,"instruction":"Garnish with sour cream drizzle and fresh cilantro. Plate with rice and beans.","whyExplanation":"Garnish goes on AFTER the oven — cilantro wilts and sour cream splits under heat.","timeSeconds":20,"isCCP":false,"tools":["squeeze_bottle"]}]'::jsonb,
  '[{"id":"ccp-uj-ench-hands","stepId":"ue1","type":"sanitation","target":"Hands washed before tortillas","tolerance":"zero misses","consequence":"Contaminated ready-to-eat food."},
    {"id":"ccp-uj-sauce-temp","stepId":"ue2","type":"temperature","target":"Sauce 170°F+","tolerance":"zero below","consequence":"Plate enters danger zone within minutes."}]'::jsonb,
  0.65, ARRAY['dairy','wheat']::TEXT[]
);

INSERT INTO challenges (id, slug, type, title, briefing, time_limit_seconds,
                        difficulty_level, hidden_domains, recipe_id, contains_traps,
                        equipment_focus, tickets, available_ingredients, is_active)
VALUES (
  '55555555-0000-0000-0000-000000000002',
  'uj-enchilada-rush', 'rush_hour', 'Uncle Julio''s: Enchilada Line',
  'Four enchilada tickets. Three sauces. One allergen trap.',
  480, 4,
  ARRAY['speed','sequencing','food_safety','judgment','sanitation']::mastery_domain[],
  '44444444-0000-0000-0000-000000000002', TRUE,
  ARRAY['oven','saute']::equipment_type[],
  '[{"id":"uj-ench-tk-1","orderNumber":401,"priority":"normal","isTrapped":false,"submittedAt":0,"timeWindowSeconds":360,"items":[{"id":"uj-ench-1a","name":"Cheese & Onion Enchiladas (2)","recipeId":"recipe-uj-cheese-enchilada-v1","modifiers":["salsa carne"],"isImpossible":false,"quantity":2}]},
    {"id":"uj-ench-tk-2","orderNumber":402,"priority":"rush","isTrapped":false,"submittedAt":30000,"timeWindowSeconds":300,"items":[{"id":"uj-ench-2a","name":"Chicken Enchiladas Verdes (2)","recipeId":"recipe-uj-chicken-enchilada-v1","modifiers":["hatch chile sauce"],"isImpossible":false,"quantity":2}]},
    {"id":"uj-ench-tk-3","orderNumber":403,"priority":"normal","isTrapped":true,"submittedAt":60000,"timeWindowSeconds":360,"items":[{"id":"uj-ench-3a","name":"Gluten-Free Enchiladas","recipeId":"recipe-uj-cheese-enchilada-v1","modifiers":["gluten-free","flour tortilla"],"isImpossible":true,"impossibleReason":"Guest requested gluten-free but specified flour tortilla. Flour contains wheat gluten.","quantity":2}]},
    {"id":"uj-ench-tk-4","orderNumber":404,"priority":"vip","isTrapped":false,"submittedAt":120000,"timeWindowSeconds":360,"items":[{"id":"uj-ench-4a","name":"Combination Plate","recipeId":"recipe-uj-combo-plate-v1","modifiers":["beef enchilada agave queso","chicken enchilada hatch chile","crispy beef taco"],"isImpossible":false,"quantity":1}]}]'::jsonb,
  '[]'::jsonb, TRUE
);

-- =====================================================================
-- Recipe: Uncle Julio's Temperature Logging Standard
-- =====================================================================
INSERT INTO recipes (id, slug, name, station, difficulty, target_time_seconds,
                     plating_standard, ideal_sequence, steps, critical_control_points,
                     waste_value_per_plate, allergens)
VALUES (
  '44444444-0000-0000-0000-000000000003',
  'recipe-uj-temp-log-v1',
  'Uncle Julio''s Temperature Logging Standard',
  'cold_station', 2, 150,
  'All five stations logged within safe range. Zero readings in danger zone.',
  '["calibrate_thermometer","walk_in_proteins","freezer","queso_hot_hold","fajita_reach_in","steam_table","log_results"]'::jsonb,
  '[{"id":"ujt1","order":1,"instruction":"Calibrate in ice bath; must read 32°F.","whyExplanation":"Uncalibrated thermometer invalidates every reading.","timeSeconds":15,"isCCP":true,"tools":["thermometer","ice_bath"]},
    {"id":"ujt4","order":4,"instruction":"Queso hot hold must be 135°F+.","whyExplanation":"TCS food; below 135°F enters danger zone.","timeSeconds":20,"isCCP":true,"tools":["thermometer"],"targetTemp":145},
    {"id":"ujt6","order":6,"instruction":"Steam table rice/beans 135°F+.","whyExplanation":"Bacillus cereus in rice causes vomiting.","timeSeconds":20,"isCCP":true,"tools":["thermometer"],"targetTemp":150}]'::jsonb,
  '[{"id":"ccp-uj-cal","stepId":"ujt1","type":"sanitation","target":"Thermometer reads 32°F","tolerance":"+/- 2°F","consequence":"All shift readings invalid."},
    {"id":"ccp-uj-queso","stepId":"ujt4","type":"temperature","target":"Queso 135°F+","tolerance":"zero below","consequence":"Discard $40+ batch after 4 hours below."}]'::jsonb,
  0, ARRAY[]::TEXT[]
);

INSERT INTO challenges (id, slug, type, title, briefing, time_limit_seconds,
                        difficulty_level, hidden_domains, recipe_id, contains_traps,
                        equipment_focus, tickets, available_ingredients, is_active)
VALUES (
  '55555555-0000-0000-0000-000000000003',
  'uj-line-temps', 'temp_check', 'Uncle Julio''s: Line Temp Log',
  'Opening shift. Log walk-in, freezer, queso, reach-in, steam table.',
  180, 2,
  ARRAY['food_safety','sanitation','judgment']::mastery_domain[],
  '44444444-0000-0000-0000-000000000003', TRUE,
  ARRAY['cold_station']::equipment_type[],
  '[]'::jsonb, '[]'::jsonb, TRUE
);

-- =====================================================================
-- Recipe: Mesquite Grill Station Setup
-- =====================================================================
INSERT INTO recipes (id, slug, name, station, difficulty, target_time_seconds,
                     plating_standard, ideal_sequence, steps, critical_control_points,
                     waste_value_per_plate, allergens)
VALUES (
  '44444444-0000-0000-0000-000000000004',
  'recipe-uj-grill-mise-v1',
  'Mesquite Grill Station Setup',
  'grill', 2, 240,
  'All 12 positions filled. Raw and cooked tongs separated. Mesquite at 450°F+.',
  '["wash_hands","sani_bucket","start_mesquite_fire","stage_cold_rail","set_tools","preheat_sizzle_platters","final_temp_check"]'::jsonb,
  '[{"id":"ugs1","order":1,"instruction":"Wash hands, glove up.","whyExplanation":"Start clean.","timeSeconds":10,"isCCP":true,"tools":["sink","gloves"]},
    {"id":"ugs3","order":3,"instruction":"Start mesquite fire 30-45 min before service.","whyExplanation":"Mesquite must burn to embers; flames char outside, leave inside raw.","timeSeconds":60,"isCCP":false,"tools":["mesquite_wood","lighter"]},
    {"id":"ugs5","order":5,"instruction":"Raw tongs left, cooked tongs right; never swap.","whyExplanation":"Sharing tongs = textbook cross-contamination.","timeSeconds":25,"isCCP":true,"tools":["tongs_raw","tongs_cooked"]}]'::jsonb,
  '[{"id":"ccp-uj-gs-tongs","stepId":"ugs5","type":"sanitation","target":"Raw and cooked tongs separated","tolerance":"zero shared","consequence":"Salmonella on finished plate."}]'::jsonb,
  0, ARRAY[]::TEXT[]
);

INSERT INTO challenges (id, slug, type, title, briefing, time_limit_seconds,
                        difficulty_level, hidden_domains, recipe_id, contains_traps,
                        equipment_focus, tickets, available_ingredients, is_active)
VALUES (
  '55555555-0000-0000-0000-000000000004',
  'uj-grill-setup', 'station_setup', 'Uncle Julio''s: Grill Station Mise',
  'Dinner in 20 minutes. Set the mesquite grill station.',
  300, 2,
  ARRAY['sequencing','efficiency','sanitation']::mastery_domain[],
  '44444444-0000-0000-0000-000000000004', FALSE,
  ARRAY['grill','prep_table']::equipment_type[],
  '[]'::jsonb, '[]'::jsonb, TRUE
);

-- =====================================================================
-- Recipe: Uncle Julio's Queso Blanco (Scaled)
-- =====================================================================
INSERT INTO recipes (id, slug, name, station, difficulty, target_time_seconds,
                     plating_standard, ideal_sequence, steps, critical_control_points,
                     waste_value_per_plate, allergens)
VALUES (
  '44444444-0000-0000-0000-000000000005',
  'recipe-uj-queso-v1',
  'Uncle Julio''s Queso Blanco (Scaled)',
  'saute', 3, 420,
  'Smooth pourable queso. Correct yield for 70 covers. Hold 135°F+.',
  '["calculate_multiplier","scale_cheese","scale_milk","scale_jalapeno","scale_tomato","scale_cumin","execute_melt","hold_temp"]'::jsonb,
  '[{"id":"uq1","order":1,"instruction":"Calculate 70/20 = 3.5x multiplier.","whyExplanation":"Wrong multiplier wastes $15+ or shorts 10 guests.","timeSeconds":15,"isCCP":false,"tools":[]},
    {"id":"uq2","order":2,"instruction":"Scale white American cheese: 5 lb × 3.5 = 17.5 lb.","whyExplanation":"Bulk and cost; under-scale runs out, over-scale wastes.","timeSeconds":15,"isCCP":false,"tools":["scale"]},
    {"id":"uq3","order":3,"instruction":"Scale whole milk: 1 qt × 3.5 = 3.5 qt (7 cups).","whyExplanation":"Milk controls consistency. Too little = thick paste; too much = soup.","timeSeconds":15,"isCCP":false,"tools":["measuring_cup"]},
    {"id":"uq4","order":4,"instruction":"Scale roasted diced jalapeño: 8 oz × 3.5 = 28 oz (1.75 lb).","whyExplanation":"Jalapeño heat varies by batch. At 3.5x, taste before adding all of it.","timeSeconds":15,"isCCP":false,"tools":["scale"]},
    {"id":"uq5","order":5,"instruction":"Scale roasted diced tomato: 6 oz × 3.5 = 21 oz.","whyExplanation":"Tomato adds moisture and acidity. Too much dilutes cheese flavor.","timeSeconds":10,"isCCP":false,"tools":["scale"]},
    {"id":"uq6","order":6,"instruction":"Scale cumin: 1 tbsp × 3.5 = 3.5 tbsp.","whyExplanation":"Spices can overpower at volume. Taste and adjust.","timeSeconds":10,"isCCP":false,"tools":["measuring_spoon"]},
    {"id":"uq7","order":7,"instruction":"Melt cheese in milk over medium heat, stirring constantly. Add jalapeño, tomato, cumin when smooth.","whyExplanation":"High heat scorches cheese; bitter batch lost.","timeSeconds":300,"isCCP":true,"tools":["stock_pot","whisk","thermometer"],"targetTemp":165,"tempRange":{"min":155,"max":180}},
    {"id":"uq8","order":8,"instruction":"Transfer to hot hold. Maintain 135°F+. Stir every 15 minutes.","whyExplanation":"TCS food; 4 hours below 135°F = discard 17.5 lb of cheese.","timeSeconds":30,"isCCP":true,"tools":["steam_table","thermometer"],"targetTemp":145,"tempRange":{"min":135,"max":165}}]'::jsonb,
  '[{"id":"ccp-uj-q-hold","stepId":"uq8","type":"temperature","target":"Hot hold 135°F+","tolerance":"zero below","consequence":"Discard 17.5 lb queso ($40+) after 4 hours."}]'::jsonb,
  0.55, ARRAY['dairy']::TEXT[]
);

INSERT INTO challenges (id, slug, type, title, briefing, time_limit_seconds,
                        difficulty_level, hidden_domains, recipe_id, contains_traps,
                        equipment_focus, tickets, available_ingredients, is_active)
VALUES (
  '55555555-0000-0000-0000-000000000005',
  'uj-queso-scale', 'ghost_recipe', 'Uncle Julio''s: Scale the Queso',
  'Catering for 70. Standard batch serves 20. Scale it.',
  600, 3,
  ARRAY['kitchen_math','judgment','efficiency','waste_management']::mastery_domain[],
  '44444444-0000-0000-0000-000000000005', FALSE,
  ARRAY['saute']::equipment_type[],
  '[]'::jsonb, '[]'::jsonb, TRUE
);

-- =====================================================================
-- Recipe: Allergen Order Review
-- =====================================================================
INSERT INTO recipes (id, slug, name, station, difficulty, target_time_seconds,
                     plating_standard, ideal_sequence, steps, critical_control_points,
                     waste_value_per_plate, allergens)
VALUES (
  '44444444-0000-0000-0000-000000000006',
  'recipe-uj-allergy-review-v1',
  'Allergen Order Review',
  'prep_table', 4, 90,
  'All impossible items rejected. Safe items modified and fired. Zero allergen violations.',
  '["read_full_ticket","check_each_modifier","identify_impossible","flag_allergen_conflicts","reject_unsafe","modify_safe_items","fire_safe"]'::jsonb,
  '[{"id":"ua2","order":2,"instruction":"Check each modifier against allergens in every ingredient.","whyExplanation":"Hidden dairy in cream sauces is the same as ignored allergy.","timeSeconds":20,"isCCP":true,"tools":[]},
    {"id":"ua3","order":3,"instruction":"Identify impossible: shellfish allergy + shrimp; gluten-free + flour tortilla.","whyExplanation":"These are contradictions, not modifications.","timeSeconds":15,"isCCP":true,"tools":[]},
    {"id":"ua4","order":4,"instruction":"Reject impossible items and notify FOH.","whyExplanation":"Cook is the last line of defense.","timeSeconds":15,"isCCP":true,"tools":[]}]'::jsonb,
  '[{"id":"ccp-uj-allergen","stepId":"ua3","type":"allergen","target":"All allergen conflicts identified","tolerance":"zero misses","consequence":"Anaphylaxis; lawsuit; permanent closure."}]'::jsonb,
  0, ARRAY[]::TEXT[]
);

INSERT INTO challenges (id, slug, type, title, briefing, time_limit_seconds,
                        difficulty_level, hidden_domains, recipe_id, contains_traps,
                        equipment_focus, tickets, available_ingredients, is_active)
VALUES (
  '55555555-0000-0000-0000-000000000006',
  'uj-allergy-order', 'mock_impossible', 'Uncle Julio''s: The Allergy Table',
  'Table 14: four guests, dietary restrictions. Read every modifier.',
  120, 4,
  ARRAY['judgment','food_safety','sanitation']::mastery_domain[],
  '44444444-0000-0000-0000-000000000006', TRUE,
  ARRAY['prep_table']::equipment_type[],
  '[{"id":"uj-allergy-tk-1","orderNumber":501,"priority":"normal","isTrapped":true,"submittedAt":0,"timeWindowSeconds":120,"items":[{"id":"uj-al-1a","name":"Chicken Fajitas (dairy-free)","recipeId":"recipe-uj-chicken-fajita-v1","modifiers":["dairy-free","no cheese","no sour cream","corn tortillas"],"isImpossible":false,"quantity":1},{"id":"uj-al-1b","name":"Shrimp Fajitas (shellfish allergy)","recipeId":"recipe-uj-shrimp-fajita-v1","modifiers":["shellfish allergy"],"isImpossible":true,"impossibleReason":"Guest has a shellfish allergy but ordered shrimp. Shrimp is shellfish. This order cannot be fired. Notify FOH to suggest chicken or steak fajitas instead.","quantity":1},{"id":"uj-al-1c","name":"Cheese Enchiladas (gluten-free, flour tortilla)","recipeId":"recipe-uj-cheese-enchilada-v1","modifiers":["gluten-free","flour tortilla"],"isImpossible":true,"impossibleReason":"Flour tortilla contains wheat gluten. Cannot be gluten-free. Must clarify: switch to corn tortilla or remove the gluten-free requirement.","quantity":2},{"id":"uj-al-1d","name":"Steak Fajitas","recipeId":"recipe-uj-steak-fajita-v1","modifiers":["medium","no onions"],"isImpossible":false,"quantity":1}]}]'::jsonb,
  '[]'::jsonb, TRUE
);
