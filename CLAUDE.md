# Keira's Kitchen

Personal recipe web app (installable PWA) for Keira. Purpose: get her from
"I want to make that" to step 1 on screen faster than asking ChatGPT.

- Stack: React + Vite, React Router, vite-plugin-pwa (`registerType: 'autoUpdate'`),
  Supabase (email/password login + `recipes` table, SQL in `supabase/migrations/`).
  Keys come from `.env.local` / Vercel env vars (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`); never the secret/service_role key.
- Designed mobile-first at **360px** wide.
- Production: https://keiraskitchen.vercel.app
- Sample data (tests only, not in Supabase): `src/data/recipes.json` (`schemaVersion: 1`). Units are metric
  as used in South Africa: g, kg, ml, l, tsp, tbsp; oven temperatures in °C.
- Decisions log: `docs/decisions.md`. Ideas: `docs/backlog.md`.
  Recipe import/export format: `docs/recipe-format.md`.

## Commands

- `npm run dev`: dev server
- `npm run build`: production build to `dist/`
- `npm run preview`: serve the production build

## Standing rules

1. **Report and ask before changing anything visible outside the request.**
   If a task seems to need a visible change that wasn't asked for, describe it
   and wait for an OK.
2. **All colours, fonts, spacing and radii come from `src/theme.css`** (CSS
   variables). No raw hex values, px spacing or font stacks in components. If a
   value is missing, add a variable to the theme first. `--color-bg` is also
   duplicated in `index.html` (theme-color) and `vite.config.js` (manifest);
   keep them in sync.
3. **Never use browser `alert()` / `confirm()` / `prompt()`.** Use the shared
   `Dialog` component (`src/components/Dialog.jsx`).
   - Red (`destructive`) only for actions that lose data.
   - Destructive wording names exactly what is lost, e.g. "Delete Bobotie?
     The recipe, its 15 ingredients, 9 steps and your notes will be deleted."
     Never a vague "Are you sure?".
4. **Tap targets are at least 44px** (`--tap-min`), and **56px in cook mode**
   (`--tap-min-cook`). **Every tappable element shows press feedback** (e.g.
   `:active` scale/background using `--press-scale` / `--press-duration`).
5. **All records use UUIDs** (`crypto.randomUUID()`) for recipes, ingredients
   and steps. Nothing is keyed or looked up by title. Order uses `position`,
   not array index or title.
6. All recipe import, export and backup must follow docs/recipe-format.md.
   Internal storage keeps its own schema (UUIDs, positions, timerSeconds);
   the import format is converted on save.
