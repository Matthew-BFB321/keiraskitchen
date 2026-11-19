# Decisions

## 2026-11-19: Project set up

- **Name:** Keira's Kitchen. Used for the app title and the manifest `name` and `short_name`.
- **Repo / URL slug:** `keiraskitchen`
  - GitHub: https://github.com/Matthew-BFB321/keiraskitchen
  - Production: https://keiraskitchen.vercel.app
- **Purpose:** get Keira from "I want to make that" to step 1 on screen faster
  than asking ChatGPT.
- **Stack:** React + Vite, React Router for screens, vite-plugin-pwa with
  `registerType: 'autoUpdate'` so installed copies update themselves on next
  launch. No backend yet; recipes start as a local JSON file.
- **Mobile-first at 360px wide.** The phone in the kitchen is the main device.

### Why a web app, not a native app

Distributing a native iPhone app isn't free: it needs a paid Apple Developer
membership for TestFlight or the App Store, and free sideloaded builds expire
after 7 days. An installable PWA costs nothing, installs from Safari via "Add to
Home Screen", runs full-screen, works offline, and updates by simply deploying.

### Data conventions

- `schemaVersion: 1` at the top of the data so future formats can be migrated.
- Every recipe, ingredient and step has a UUID; order uses `position`.
- Metric units as used in South Africa: g, kg, ml, l, tsp, tbsp; °C for ovens.

## 2026-11-19: Recipe import format (spec v1.1)

- **Recipes come in through one JSON format**, defined in
  `docs/recipe-format.md` (format version 1, v1.1 rules). ChatGPT imports,
  bulk imports and backup restores all use it.
- **Why:** Keira's own ChatGPT turns a recipe into this JSON, and the app only
  validates it, shows a preview and saves it. So the app needs no built-in AI,
  no API key and no API costs.
- **Instagram recipes are added manually** through the Recipe builder, not
  through ChatGPT.
- **Import format ≠ internal storage.** On save, the app assigns its own UUIDs
  and positions and converts `timerMin` to `timerSeconds` (× 60). Internal
  storage keeps its own schema.

## 2026-11-19: Internal schema gains `group` and `source`

- Ingredients now have an optional `group` (section name like "Sauce", or
  null), and recipes have an optional `source` (where the recipe came from, or
  null). Both are kept from the import format so nothing ChatGPT provides is
  lost on save.
- The sample data in `src/data/recipes.json` doesn't have these fields yet;
  treat a missing value as null.
