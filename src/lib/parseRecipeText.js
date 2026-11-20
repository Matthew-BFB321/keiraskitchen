import { readQuantityText, normalizeUnit, stripStepNumber } from './parseRecipeImport.js'
import { unitLabel } from './quantities.js'

/*
 * Reads the recipe builder's plain-text boxes: one ingredient per line and
 * one step per line. Quantities and units use the importer's own rules, and
 * quantity text is passed on as typed so the shared validator applies the
 * same fixes ("1/2" → 0.5, "2-3" → 2 with "2-3" in the note).
 */

const BULLET = /^[-•*]\s+/

// One ingredient line → blank, heading ("Sauce:") or ingredient.
export function parseIngredientLine(line) {
  let text = String(line ?? '').trim().replace(BULLET, '').trim()
  if (text === '' || text === ':') return { kind: 'blank' }
  if (text.endsWith(':')) return { kind: 'heading', name: text.slice(0, -1).trim() }

  // Item and note split at the first comma (not a decimal comma like "1,5")
  const comma = text.search(/,(?!\d)|(?<!\d),/)
  const note = comma === -1 ? null : text.slice(comma + 1).trim() || null
  text = (comma === -1 ? text : text.slice(0, comma)).trim()

  let words = text.split(/\s+/).filter(Boolean)
  let quantityText = null
  let unit = null

  // "500g" / "2tbsp": a unit stuck to the number
  const stuck = words[0]?.match(/^(\d+(?:[.,]\d+)?)([a-z]+)\.?$/i)
  if (stuck && normalizeUnit(stuck[2])) {
    quantityText = stuck[1]
    unit = normalizeUnit(stuck[2])
    words = words.slice(1)
  } else {
    // Longest run of up to 3 leading words that reads as an amount: "1 1/2", "2 - 3", "2 to 3"
    for (let n = Math.min(3, words.length); n >= 1; n--) {
      const candidate = words.slice(0, n).join(' ')
      if (readQuantityText(candidate)) {
        quantityText = candidate
        words = words.slice(n)
        break
      }
    }
    // Unit after the amount; without an amount only if more words follow ("pinch salt")
    const maybeUnit = words[0] && normalizeUnit(words[0].replace(/\.$/, ''))
    if (maybeUnit && (quantityText !== null || words.length > 1)) {
      unit = maybeUnit
      words = words.slice(1)
    }
  }
  if (unit && words[0]?.toLowerCase() === 'of' && words.length > 1) words = words.slice(1)

  return { kind: 'ingredient', quantityText, unit, item: words.join(' '), note }
}

const NUM = String.raw`\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+|\d*[½¼¾⅓⅔]`
const HOURS = String.raw`(?:hours?|hrs?|h)\b`
const MINUTES = String.raw`(?:minutes?|mins?|m)\b`
const RANGE_END = String.raw`(?:\s*(?:-|–|—|to)\s*(?:${NUM}))?`
const DURATION = new RegExp(
  String.raw`(?:\b(half an?|an?)\s+hour\b|(${NUM})${RANGE_END}\s*${HOURS})(?:\s*(?:and\s+)?(${NUM})\s*${MINUTES})?` +
    String.raw`|(${NUM})${RANGE_END}\s*${MINUTES}`,
  'i',
)

function amount(text) {
  return readQuantityText(text)?.value ?? null
}

// Minutes from the first time mentioned ("10 minutes", "1 hr 30 min", "an hour"), or null.
export function detectTimerMinutes(text) {
  const m = String(text ?? '').match(DURATION)
  if (!m) return null
  const [, words, hours, extraMinutes, minutes] = m
  if (minutes !== undefined) return amount(minutes)
  const h = words ? (/half/i.test(words) ? 0.5 : 1) : amount(hours)
  if (h === null) return null
  return h * 60 + (extraMinutes !== undefined ? (amount(extraMinutes) ?? 0) : 0)
}

const TIMER_MARK = /\s*\((?:timer:?\s*([^)]*)|no timer)\)\s*$/i

// One step line → blank, or { text, timerMin } (timerMin null when under 2 minutes or none).
export function parseStepLine(line) {
  const raw = String(line ?? '').trim()
  if (raw === '') return { kind: 'blank' }

  let text = stripStepNumber(raw).text
  let timerMin
  const mark = text.match(TIMER_MARK)
  if (mark) {
    text = text.slice(0, mark.index).trim()
    timerMin = mark[1] !== undefined ? detectTimerMinutes(mark[1]) : null
  } else {
    timerMin = detectTimerMinutes(text)
  }
  if (timerMin !== null && timerMin < 2) timerMin = null
  return { kind: 'step', text, timerMin }
}

// Writes a number plainly: 0.5 → "0.5", 2 → "2".
const plain = (n) => String(Math.round(n * 1000) / 1000)

// Saved ingredients → text lines, with "Name:" where the group changes.
export function ingredientsToText(ingredients) {
  const lines = []
  let group = null
  for (const ing of [...ingredients].sort((a, b) => a.position - b.position)) {
    const ingGroup = ing.group ?? null
    if (ingGroup !== group) {
      if (ingGroup !== null) lines.push(`${ingGroup}:`)
      group = ingGroup
    }
    const quantity = ing.quantity != null ? plain(ing.quantity) : null
    const unit = ing.unit ? unitLabel(ing.unit, ing.quantity ?? 0) : null
    const main = [quantity, unit, ing.item].filter(Boolean).join(' ')
    lines.push(ing.note ? `${main}, ${ing.note}` : main)
  }
  return lines.join('\n')
}

function formatMinutes(min) {
  const h = Math.floor(min / 60)
  const m = Math.round((min % 60) * 100) / 100
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

// Saved steps → text lines. A "(timer …)" or "(no timer)" mark is added only
// when reading the text alone wouldn't give back the saved timer.
export function stepsToText(steps) {
  return [...steps]
    .sort((a, b) => a.position - b.position)
    .map((step) => {
      const saved = step.timerSeconds != null && step.timerSeconds >= 120 ? step.timerSeconds / 60 : null
      const read = parseStepLine(step.text)
      if (read.text === step.text && read.timerMin === saved) return step.text
      return saved === null ? `${step.text} (no timer)` : `${step.text} (timer ${formatMinutes(saved)})`
    })
    .join('\n')
}
