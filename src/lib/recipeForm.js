import { FORMAT, VERSION, validateRecipeData, buildRecipe } from './parseRecipeImport.js'
import { newId } from './uuid.js'

/*
 * Recipe builder form state <-> recipe. The form is turned into the import
 * format and checked by the importer's own validator, so manual and imported
 * recipes follow one set of rules.
 *
 * Form fields stay as typed text; rows are ingredients or section headings:
 *   rows:  [{ kind: 'section', key, name } | { kind: 'ingredient', key, id, quantity, unit, item, note }]
 *   steps: [{ key, id, text, timerMin }]
 * `key` is for React; `id` is the saved UUID (null for new rows).
 */

export function newIngredientRow() {
  return { kind: 'ingredient', key: newId(), id: null, quantity: '', unit: '', item: '', note: '' }
}

export function newSectionRow() {
  return { kind: 'section', key: newId(), name: '' }
}

export function newStepRow() {
  return { key: newId(), id: null, text: '', timerMin: '' }
}

export function emptyForm() {
  return {
    title: '',
    description: '',
    servings: 4,
    prepMin: '',
    cookMin: '',
    tags: [],
    rows: [newIngredientRow()],
    steps: [newStepRow()],
    notes: '',
    source: '',
  }
}

const text = (value) => (value == null ? '' : String(value))

// For edit mode and pre-filled drafts. A heading is inserted wherever the group changes.
export function recipeToForm(recipe) {
  const rows = []
  let group = null
  for (const ing of [...recipe.ingredients].sort((a, b) => a.position - b.position)) {
    const ingGroup = ing.group ?? null
    if (ingGroup !== group) {
      if (ingGroup !== null) rows.push({ ...newSectionRow(), name: ingGroup })
      group = ingGroup
    }
    rows.push({
      kind: 'ingredient',
      key: ing.id ?? newId(),
      id: ing.id ?? null,
      quantity: text(ing.quantity),
      unit: ing.unit ?? '',
      item: text(ing.item),
      note: text(ing.note),
    })
  }

  return {
    title: text(recipe.title),
    description: text(recipe.description),
    servings: recipe.servings ?? 4,
    prepMin: text(recipe.prepMin),
    cookMin: text(recipe.cookMin),
    tags: [...(recipe.tags ?? [])],
    rows: rows.length > 0 ? rows : [newIngredientRow()],
    steps: [...recipe.steps]
      .sort((a, b) => a.position - b.position)
      .map((s) => ({
        key: s.id ?? newId(),
        id: s.id ?? null,
        text: text(s.text),
        timerMin: s.timerSeconds != null ? String(Math.round((s.timerSeconds / 60) * 100) / 100) : '',
      })),
    notes: text(recipe.notes),
    source: text(recipe.source),
  }
}

const blank = (value) => String(value ?? '').trim() === ''
const nullIfBlank = (value) => (blank(value) ? null : String(value).trim())
const numberOrNull = (value) => (blank(value) ? null : Number(String(value).trim().replace(',', '.')))

function isEmptyIngredient(row) {
  return blank(row.quantity) && blank(row.unit) && blank(row.item) && blank(row.note)
}

function isEmptyStep(step) {
  return blank(step.text) && blank(step.timerMin)
}

/*
 * Drops completely empty rows, works out each ingredient's group from the
 * nearest heading above it, and keeps the form keys alongside so validator
 * errors can be shown on the right row.
 */
function collectRows(form) {
  const ingredients = []
  const sectionErrors = []
  let section = null
  for (const row of form.rows) {
    if (row.kind === 'section') {
      section = row
      continue
    }
    if (isEmptyIngredient(row)) continue
    if (section && blank(section.name) && !sectionErrors.some((e) => e.key === section.key)) {
      sectionErrors.push({ key: section.key, message: 'Section has no name.' })
    }
    ingredients.push({ row, group: section ? nullIfBlank(section.name) : null })
  }
  const steps = form.steps.filter((s) => !isEmptyStep(s))
  return { ingredients, steps, sectionErrors }
}

// The form as an import-format recipe (empty rows already dropped).
export function formToImport(form) {
  const { ingredients, steps } = collectRows(form)
  return {
    format: FORMAT,
    version: VERSION,
    title: form.title,
    description: nullIfBlank(form.description),
    servings: form.servings,
    prepMin: numberOrNull(form.prepMin),
    cookMin: numberOrNull(form.cookMin),
    tags: form.tags,
    ingredients: ingredients.map(({ row, group }) => ({
      group,
      quantity: nullIfBlank(row.quantity),
      unit: nullIfBlank(row.unit),
      item: row.item,
      note: nullIfBlank(row.note),
    })),
    steps: steps.map((s) => ({ text: s.text, timerMin: numberOrNull(s.timerMin) })),
    notes: nullIfBlank(form.notes),
    source: nullIfBlank(form.source),
  }
}

/*
 * Validates and converts the form. `existing` is the recipe being edited
 * (keeps its id, row ids, photo and favourite); omit it for a new recipe.
 *
 * Errors: [{ field, key, message }]. `field` is the form field ('title',
 * 'ingredients', 'steps', ...) and `key` the row it belongs to, if any.
 */
export function saveForm(form, existing = null) {
  const { ingredients, steps, sectionErrors } = collectRows(form)
  const { value, errors } = validateRecipeData(formToImport(form))

  const mapped = errors.map(({ field, message }) => {
    const [list, index, part] = field.split('.')
    if (list === 'ingredients' && index !== undefined) {
      return { field: part ?? 'item', key: ingredients[Number(index)].row.key, message }
    }
    if (list === 'steps' && index !== undefined) {
      return { field: part ?? 'text', key: steps[Number(index)].key, message }
    }
    return { field, key: null, message }
  })
  const allErrors = [...sectionErrors.map((e) => ({ field: 'name', ...e })), ...mapped]
  if (allErrors.length > 0) return { ok: false, errors: allErrors }

  const recipe = buildRecipe(
    value,
    {
      recipeId: existing?.id,
      ingredientIds: ingredients.map(({ row }) => row.id ?? undefined),
      stepIds: steps.map((s) => s.id ?? undefined),
    },
    { photoUrl: existing?.photoUrl, isFavourite: existing?.isFavourite },
  )
  return { ok: true, recipe }
}
