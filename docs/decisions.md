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

## 2026-11-19: Fixed tag list

- Tags come from a fixed list in `src/config/tags.js`, shown in this order:
  Pasta, Asian, Protein, Baking, Quick, Burgers, Creamy. Recipes store the
  lowercase id; screens show the label.
- **Why:** the list is chosen from how Keira actually looks for recipes.
  Free-form tags from ChatGPT ("dinner", "south african", "one tray") would
  fill the chip row with clutter. Ingredients like garlic are found with the
  search box, not tags.
- At most 3 tags per recipe; none is fine. On import, tags are matched to the
  list ignoring case, and unknown tags are dropped and listed as fixes.
- The Library only shows chips for tags that at least one recipe uses.
- Recipe format rules bumped to v1.2 (format version stays 1).

## 2026-11-20: Recipe builder uses plain text

- Ingredients and steps are typed as two plain text boxes, one ingredient or
  step per line, instead of a card per row with move/remove buttons. Each box
  shows a live "Read as" preview of exactly what Save will store.
- Ingredient lines: optional amount ("1/2", "1 1/2", "½", "2-3"), optional
  unit (allowed units and the importer's synonyms), then the item; anything
  after the first comma is the note. A line ending in ":" starts a section.
  Amounts and units go through the importer's own rules and validator.
- Step lines: leading numbers ("1.", "Step 2:") are removed. The first time
  mentioned ("10 minutes", "1 hr 30 min", "an hour") becomes the step's timer
  if it's 2 minutes or more. A line can end with "(timer 5 min)" to set a timer
  the text doesn't mention, or "(no timer)" to turn one off; the mark is not
  saved in the step text. Editing adds these marks where needed so timers
  survive a round trip.
- Editing keeps the recipe id, photo and favourite, but ingredient and step
  ids are regenerated on every save (rows no longer have an identity of their
  own). Cook-mode ticks for a recipe edited mid-cook don't carry over.

## 2026-11-20: Recipes stored in Supabase, with email/password login

- **Storage:** one Supabase table, `recipes`, with **one row per recipe**:
  `id`, `user_id`, `schema_version`, `title`, `is_favourite`, timestamps, and
  a `data` JSON column holding everything else (description, servings, times,
  tags, ingredients, steps, notes, source, photoUrl). SQL:
  `supabase/migrations/001_recipes.sql`.
- **Why one row with JSON instead of three tables (recipes, ingredients,
  steps):** a recipe is always saved and read as a whole. One row means each
  save is a single atomic write, so a recipe can never be left half-saved
  (e.g. new ingredients but old steps) if the connection drops mid-save. It
  also needs no joins, mirrors the import format, and keeps ingredient and
  step order exactly as stored. `schema_version` lets the JSON shape be
  migrated later. Title and favourite get their own columns because the
  Library lists and toggles them.
- **Security:** row level security limits every user to rows where
  `user_id = auth.uid()` for select, insert, update and delete. The two
  accounts are separate: each sees only its own recipes (no shared household
  collection). The browser only ever has the publishable (anon) key, which is
  safe with RLS; the secret/service_role key is never used in the app.
- **Login:** email and password only; accounts are created in the Supabase
  dashboard and public sign-ups are off. supabase-js keeps the session on the
  phone and refreshes it, so Keira stays logged in.
- **Saving feels instant:** the screen updates straight away; if Supabase then
  fails, that one change is undone and a toast says so.
- **Offline:** the last loaded recipes are kept in localStorage, so the app
  still opens and shows recipes with no signal (read only; changes are
  refused with a message). Logging out removes that copy from the phone.
- **Sample recipes** (`src/data/recipes.json`) are test data only and are not
  put into Supabase.
