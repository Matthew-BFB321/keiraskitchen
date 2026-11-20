import { FORMAT, VERSION, validateRecipeData, buildRecipe } from './parseRecipeImport.js'
import { parseIngredientLine, parseStepLine, ingredientsToText, stepsToText } from './parseRecipeText.js'

/*
 * Recipe builder form state <-> recipe. Ingredients and steps are plain text,
 * one per line. The form is turned into the import format and checked by the
 * importer's own validator, so manual and imported recipes follow one set of
 * rules. Blank lines are ignored.
 */

export function emptyForm() {
  return {
    title: '',
    description: '',
    servings: 4,
    prepMin: '',
    cookMin: '',
    tags: [],
    ingredientsText: '',
    stepsText: '',
    notes: '',
    source: '',
  }
}

const text = (value) => (value == null ? '' : String(value))

// For edit mode and pre-filled drafts.
export function recipeToForm(recipe) {
  return {
    title: text(recipe.title),
    description: text(recipe.description),
    servings: recipe.servings ?? 4,
    prepMin: text(recipe.prepMin),
    cookMin: text(recipe.cookMin),
    tags: [...(recipe.tags ?? [])],
    ingredientsText: ingredientsToText(recipe.ingredients ?? []),
    stepsText: stepsToText(recipe.steps ?? []),
    notes: text(recipe.notes),
    source: text(recipe.source),
  }
}

const blank = (value) => String(value ?? '').trim() === ''
const nullIfBlank = (value) => (blank(value) ? null : String(value).trim())
const numberOrNull = (value) => (blank(value) ? null : Number(String(value).trim().replace(',', '.')))

// Reads the two text boxes, keeping each entry's line number (from 1).
function readLines(form) {
  const ingredients = []
  const headings = []
  let group = null
  form.ingredientsText.split('\n').forEach((raw, i) => {
    const parsed = parseIngredientLine(raw)
    if (parsed.kind === 'heading') {
      group = parsed.name
      headings.push({ line: i + 1, heading: parsed.name })
    } else if (parsed.kind === 'ingredient') {
      ingredients.push({ line: i + 1, group, ...parsed })
    }
  })
  const steps = []
  form.stepsText.split('\n').forEach((raw, i) => {
    const parsed = parseStepLine(raw)
    if (parsed.kind === 'step') steps.push({ line: i + 1, ...parsed })
  })
  return { ingredients, headings, steps }
}

function toImport(form, { ingredients, steps }) {
  return {
    format: FORMAT,
    version: VERSION,
    title: form.title,
    description: nullIfBlank(form.description),
    servings: form.servings,
    prepMin: numberOrNull(form.prepMin),
    cookMin: numberOrNull(form.cookMin),
    tags: form.tags,
    ingredients: ingredients.map((ing) => ({
      group: ing.group,
      quantity: ing.quantityText,
      unit: ing.unit,
      item: ing.item,
      note: ing.note,
    })),
    steps: steps.map((s) => ({ text: s.text, timerMin: s.timerMin })),
    notes: nullIfBlank(form.notes),
    source: nullIfBlank(form.source),
  }
}

// The form as an import-format recipe (blank lines already dropped).
export function formToImport(form) {
  return toImport(form, readLines(form))
}

// Validates the form; errors get the box ('ingredients' / 'steps') and line number.
function check(form) {
  const lines = readLines(form)
  const { value, errors } = validateRecipeData(toImport(form, lines))
  const mapped = errors.map(({ field, message }) => {
    const [list, index] = field.split('.')
    if (list === 'ingredients' && index !== undefined) {
      return { field: 'ingredients', line: lines.ingredients[Number(index)].line, message }
    }
    if (list === 'steps' && index !== undefined) {
      return { field: 'steps', line: lines.steps[Number(index)].line, message }
    }
    return { field, line: null, message }
  })
  return { lines, value, errors: mapped }
}

/*
 * Validates and converts the form. `existing` is the recipe being edited:
 * its id, photo and favourite are kept. Ingredient and step ids are new on
 * every save. Errors: [{ field, line, message }].
 */
export function saveForm(form, existing = null) {
  const { value, errors } = check(form)
  if (errors.length > 0) return { ok: false, errors }
  const recipe = buildRecipe(
    value,
    { recipeId: existing?.id },
    { photoUrl: existing?.photoUrl, isFavourite: existing?.isFavourite },
  )
  return { ok: true, recipe }
}

/*
 * How the boxes were read, exactly as Save would store them, for the live
 * preview. Ingredients include headings in line order; each entry carries
 * any problem with its line.
 */
export function previewForm(form) {
  const { lines, value, errors } = check(form)
  const errorFor = (field, line) =>
    errors
      .filter((e) => e.field === field && e.line === line)
      .map((e) => e.message)
      .join(' ') || null

  const ingredients = [
    ...lines.headings,
    ...lines.ingredients.map((ing, i) => ({ line: ing.line, ...value.ingredients[i], error: errorFor('ingredients', ing.line) })),
  ].sort((a, b) => a.line - b.line)

  const steps = lines.steps.map((s, i) => ({ line: s.line, ...value.steps[i], error: errorFor('steps', s.line) }))
  return { ingredients, steps }
}
