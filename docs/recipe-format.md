# Keira's Kitchen recipe format (v1.1 rules, format version 1)

Every recipe entering the app (ChatGPT import, bulk import, backup
restore) uses this JSON. The app validates it, shows a preview, then
saves it, assigning its own UUIDs, positions and timerSeconds
(timerMin x 60).

Fields:
- format: always "keiras-kitchen-recipe" (reject otherwise)
- version: always 1 (reject otherwise)
- title: text, required
- description: one sentence, or null
- servings: whole number, required (base for the servings scaler)
- prepMin, cookMin: whole minutes, or null. prepMin includes rising,
  marinating and resting time
- tags: list of 1-4 lowercase words
- ingredients: list, each with:
  - group: section name like "Sauce", or null
  - quantity: number (decimals, never fractions or ranges), or null
    for "to taste"
  - unit: one of g, kg, ml, l, tsp, tbsp, cup, pinch, clove, can,
    slice, bunch, or null for whole items (never "whole" or "piece")
  - item: the ingredient only; preparation words (diced, minced,
    sliced) go in note
  - note: text or null
- steps: list, in order, each with:
  - text: one step, no number in front
  - timerMin: number for any step with a set time of 2 minutes or
    more, else null
- notes: text or null
- source: where the recipe came from, text or null

Units: metric, oven in °C, 1 cup = 250 ml.

Example:
```json
{"format":"keiras-kitchen-recipe","version":1,"title":"Shakshuka",
"description":"Eggs poached in a spiced tomato and pepper sauce.",
"servings":2,"prepMin":10,"cookMin":20,
"tags":["quick","vegetarian","breakfast"],
"ingredients":[
{"group":null,"quantity":1,"unit":"tbsp","item":"olive oil","note":null},
{"group":null,"quantity":1,"unit":null,"item":"onion","note":"finely chopped"},
{"group":null,"quantity":1,"unit":"can","item":"chopped tomatoes","note":"400 g"},
{"group":null,"quantity":4,"unit":null,"item":"eggs","note":null},
{"group":null,"quantity":null,"unit":null,"item":"salt and pepper","note":"to taste"}],
"steps":[
{"text":"Heat the oil and fry the onion until soft.","timerMin":5},
{"text":"Add the tomatoes and simmer until thickened.","timerMin":10},
{"text":"Make four wells, crack in the eggs, cover and cook until set.","timerMin":6}],
"notes":"Add feta at the end if you have it.","source":"ChatGPT"}
```
