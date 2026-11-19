import { newId } from './uuid.js'
import { findTag, MAX_TAGS } from '../config/tags.js'

/*
 * Parses pasted text in the recipe import format (docs/recipe-format.md)
 * and converts it to the internal schema.
 *
 * Returns { ok: true, recipe, fixes } or { ok: false, errors }.
 * Mistakes with an obvious meaning are fixed and listed in `fixes`;
 * everything else is collected in `errors`. All messages are plain
 * language for a non-technical reader.
 */

export const FORMAT = 'keiras-kitchen-recipe'
export const VERSION = 1
export const UNITS = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'pinch', 'clove', 'can', 'slice', 'bunch']

// Lowercased spellings that clearly mean an allowed unit (null = whole item, no unit).
const UNIT_ALIASES = {
  '': null,
  whole: null,
  piece: null,
  pieces: null,
  pc: null,
  pcs: null,
  each: null,
  cups: 'cup',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  tbs: 'tbsp',
  tbl: 'tbsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  gram: 'g',
  grams: 'g',
  kilogram: 'kg',
  kilograms: 'kg',
  millilitre: 'ml',
  millilitres: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  litre: 'l',
  litres: 'l',
  liter: 'l',
  liters: 'l',
  pinches: 'pinch',
  cloves: 'clove',
  cans: 'can',
  tin: 'can',
  tins: 'can',
  slices: 'slice',
  bunches: 'bunch',
}

const VULGAR_FRACTIONS = {
  '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4',
  '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5', '⅙': '1/6', '⅚': '5/6',
  '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
}

export function parseRecipeImport(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    return fail(['Nothing was pasted.'])
  }

  const json = extractJson(text)
  if (json === null) {
    return fail([
      "Couldn't find any recipe data in what was pasted. Paste the whole reply from ChatGPT, including everything between the { and } brackets.",
    ])
  }

  let data
  try {
    data = JSON.parse(json)
  } catch {
    return fail([
      'The recipe data is incomplete or broken. It may have been cut off when copying. Ask ChatGPT for the recipe again.',
    ])
  }

  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return fail(["The pasted data isn't a single recipe."])
  }

  const errors = []
  const fixes = []

  if (data.format !== FORMAT) {
    errors.push(`This isn't a Keira's Kitchen recipe (format should be "${FORMAT}").`)
  }
  if (data.version === undefined) {
    errors.push(`The recipe doesn't say which format version it uses (it should be ${VERSION}).`)
  } else if (data.version !== VERSION) {
    errors.push(`This recipe uses format version ${JSON.stringify(data.version)}; only version ${VERSION} is supported.`)
  }

  const title = typeof data.title === 'string' ? data.title.trim() : ''
  if (title === '') errors.push('The recipe has no title.')

  const description = optionalText(data.description, errors, "The description isn't text.")
  const notes = optionalText(data.notes, errors, "The recipe notes aren't text.")
  const source = optionalText(data.source, errors, "The source isn't text.")

  const servings = readServings(data.servings, errors, fixes)
  const prepMin = readMinutes(data.prepMin, 'Prep time', errors, fixes)
  const cookMin = readMinutes(data.cookMin, 'Cooking time', errors, fixes)
  const tags = readTags(data.tags, fixes)

  let ingredients = []
  if (!Array.isArray(data.ingredients) || data.ingredients.length === 0) {
    errors.push('The recipe has no ingredients.')
  } else {
    ingredients = data.ingredients.map((raw, i) => readIngredient(raw, i + 1, errors, fixes))
  }

  let steps = []
  if (!Array.isArray(data.steps) || data.steps.length === 0) {
    errors.push('The recipe has no steps.')
  } else {
    if (data.steps.some((raw) => typeof raw === 'string')) {
      fixes.push('Some steps were plain text without timer details; they were read as steps with no timer.')
    }
    steps = data.steps.map((raw, i) => readStep(raw, i + 1, errors, fixes))
  }

  if (errors.length > 0) return fail(errors)

  return {
    ok: true,
    fixes,
    recipe: {
      id: newId(),
      title,
      description,
      servings,
      prepMin,
      cookMin,
      tags,
      photoUrl: null,
      notes,
      source,
      isFavourite: false,
      ingredients: ingredients.map((ing, i) => ({ id: newId(), position: i + 1, ...ing })),
      steps: steps.map((step, i) => ({ id: newId(), position: i + 1, ...step })),
    },
  }
}

function fail(errors) {
  return { ok: false, errors }
}

// Prefer the contents of a ``` code block; otherwise take the first { to the last }.
function extractJson(text) {
  const fence = text.match(/```[a-z]*\s*([\s\S]*?)```/i)
  const body = fence ? fence[1] : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end < start) return null
  return body.slice(start, end + 1)
}

function optionalText(value, errors, message) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') {
    errors.push(message)
    return null
  }
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

// A number, or a number written as text ("4", "1.5", "1,5"). Returns null if neither.
function readNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? { value, fromText: false } : null
  if (typeof value !== 'string') return null
  const s = value.trim()
  if (/^\d+(\.\d+)?$/.test(s)) return { value: Number(s), fromText: true }
  if (/^\d+,\d+$/.test(s)) return { value: Number(s.replace(',', '.')), fromText: true }
  return null
}

function readServings(value, errors, fixes) {
  if (value === undefined || value === null) {
    errors.push("The recipe doesn't say how many servings it makes.")
    return null
  }
  const n = readNumber(value)
  if (!n || !Number.isInteger(n.value) || n.value < 1) {
    errors.push('Servings must be a whole number like 4.')
    return null
  }
  if (n.fromText) fixes.push(`Servings "${value}" was written as text; changed to the number ${n.value}.`)
  return n.value
}

function readMinutes(value, label, errors, fixes) {
  if (value === undefined || value === null) return null
  const n = readNumber(value)
  if (!n || !Number.isInteger(n.value) || n.value < 0) {
    errors.push(`${label} must be whole minutes, like 15.`)
    return null
  }
  if (n.fromText) fixes.push(`${label} "${value}" was written as text; changed to the number ${n.value}.`)
  return n.value
}

// Tags are never an error. They're matched to the fixed list (src/config/tags.js)
// ignoring case; anything not on the list is dropped and reported as a fix.
function readTags(value, fixes) {
  if (value === undefined || value === null) return []
  let list = value
  if (typeof value === 'string') {
    list = value.split(',')
    fixes.push('Tags were written as one piece of text; split them at the commas.')
  } else if (!Array.isArray(value)) {
    fixes.push("Tags weren't a list, so they were left out.")
    return []
  }

  const tags = []
  let dropped = 0
  for (const tag of list) {
    if (typeof tag !== 'string' || tag.trim() === '') {
      dropped++
      continue
    }
    const clean = tag.trim()
    const known = findTag(clean.toLowerCase())
    if (!known) {
      fixes.push(`Removed tag "${clean}" (not in the tag list).`)
      continue
    }
    if (!tags.includes(known.id)) tags.push(known.id)
  }
  if (dropped > 0) fixes.push(`Removed ${dropped} empty tag${dropped === 1 ? '' : 's'}.`)

  if (tags.length > MAX_TAGS) {
    const extra = tags.splice(MAX_TAGS)
    fixes.push(
      `Only ${MAX_TAGS} tags are allowed; kept the first ${MAX_TAGS} and dropped ${extra.map((t) => `"${t}"`).join(', ')}.`,
    )
  }
  return tags
}

function ingredientLabel(n, item) {
  return item ? `Ingredient ${n} (${item})` : `Ingredient ${n}`
}

function readIngredient(raw, n, errors, fixes) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    errors.push(`Ingredient ${n} couldn't be read.`)
    return {}
  }

  const item = typeof raw.item === 'string' ? raw.item.trim() : ''
  if (item === '') errors.push(`Ingredient ${n} has no name.`)
  const label = ingredientLabel(n, item)

  const group = optionalText(raw.group, errors, `${label}'s section name isn't text.`)
  const existingNote = optionalText(raw.note, errors, `${label}'s note isn't text.`)
  const notePrefix = []

  const quantity = readQuantity(raw.quantity, n, label, notePrefix, errors, fixes)
  const unit = readUnit(raw.unit, label, notePrefix, errors, fixes)

  const note = [notePrefix.join(' '), existingNote].filter(Boolean).join('; ') || null
  return { quantity, unit, item, note, group }
}

function readQuantity(value, n, label, notePrefix, errors, fixes) {
  if (value === undefined || value === null) return null
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) {
      errors.push(`Ingredient ${n}'s amount must be more than 0.`)
      return null
    }
    return value
  }
  if (typeof value !== 'string') {
    errors.push(`Ingredient ${n}'s amount isn't a number.`)
    return null
  }

  const original = value.trim()
  if (original === '') {
    fixes.push(`${label}: the amount was empty, so it was treated as "to taste".`)
    return null
  }

  const single = parseAmount(original)
  if (single !== null) {
    fixes.push(
      /^\d+(\.\d+)?$/.test(original)
        ? `${label}: the amount "${original}" was written as text; changed to the number ${single}.`
        : `${label}: changed the amount "${original}" to ${single}.`,
    )
    return single
  }

  const parts = original.split(/\s*(?:-|–|—|\bto\b)\s*/i)
  if (parts.length === 2) {
    const low = parseAmount(parts[0])
    const high = parseAmount(parts[1])
    if (low !== null && high !== null) {
      notePrefix.push(original)
      fixes.push(`${label}: the amount "${original}" is a range; used ${low} and kept "${original}" in the note.`)
      return low
    }
  }

  errors.push(`Ingredient ${n}'s amount "${original}" isn't a number.`)
  return null
}

// "2", "1.5", "1,5", "1/2", "1 1/2", "½", "1½" → number, or null if not an amount.
function parseAmount(text) {
  let s = text.trim()
  for (const [glyph, frac] of Object.entries(VULGAR_FRACTIONS)) s = s.replaceAll(glyph, ` ${frac}`)
  s = s.trim().replace(/\s+/g, ' ')

  let value = null
  let m
  if (/^\d+(\.\d+)?$/.test(s)) value = Number(s)
  else if ((m = s.match(/^(\d+),(\d+)$/))) value = Number(`${m[1]}.${m[2]}`)
  else if ((m = s.match(/^(\d+)\/(\d+)$/)) && Number(m[2]) > 0) value = Number(m[1]) / Number(m[2])
  else if ((m = s.match(/^(\d+) (\d+)\/(\d+)$/)) && Number(m[3]) > 0) value = Number(m[1]) + Number(m[2]) / Number(m[3])

  if (value === null || value <= 0) return null
  return Math.round(value * 1000) / 1000
}

function readUnit(value, label, notePrefix, errors, fixes) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') {
    errors.push(`${label}'s unit isn't text.`)
    return null
  }

  const original = value.trim()
  if (UNITS.includes(original)) return original

  const lower = original.toLowerCase()
  if (UNITS.includes(lower)) {
    fixes.push(`${label}: changed the unit "${original}" to "${lower}".`)
    return lower
  }

  if (lower in UNIT_ALIASES) {
    const unit = UNIT_ALIASES[lower]
    fixes.push(
      unit === null
        ? `${label}: removed the unit "${original}" (whole items have no unit).`
        : `${label}: changed the unit "${original}" to "${unit}".`,
    )
    return unit
  }

  notePrefix.push(original)
  fixes.push(`${label}: the app doesn't know the unit "${original}", so it was moved into the note.`)
  return null
}

function readStep(raw, n, errors, fixes) {
  const step = typeof raw === 'string' ? { text: raw } : raw
  if (step === null || typeof step !== 'object' || Array.isArray(step)) {
    errors.push(`Step ${n} couldn't be read.`)
    return {}
  }

  let text = typeof step.text === 'string' ? step.text.trim() : ''
  // "1. ", "2) ", "Step 3: " but not "1.5 litres" or "2-3 minutes"
  const numbered = text.match(/^(?:step\s+\d+\s*[.):-]?|\d+[.)])\s+/i)
  if (numbered && numbered[0].length < text.length) {
    fixes.push(`Step ${n}: removed "${numbered[0].trim()}" from the start.`)
    text = text.slice(numbered[0].length)
  }
  if (text === '') errors.push(`Step ${n} has no instructions.`)

  return { text, timerSeconds: readTimer(step.timerMin, n, errors, fixes) }
}

function readTimer(value, n, errors, fixes) {
  if (value === undefined || value === null) return null
  const minutes = readNumber(value)
  if (!minutes || minutes.value <= 0) {
    errors.push(`Step ${n}'s timer isn't a number of minutes.`)
    return null
  }
  if (minutes.fromText) fixes.push(`Step ${n}: the timer "${value}" was written as text; changed to ${minutes.value} minutes.`)
  if (minutes.value < 2) {
    fixes.push(`Step ${n}: removed the ${minutes.value}-minute timer (timers are only for 2 minutes or more).`)
    return null
  }
  return Math.round(minutes.value * 60)
}
