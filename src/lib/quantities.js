// Scaling and display of ingredient quantities for the Recipe screen and cook mode.

const QUARTER_GLYPHS = { 0.25: '¼', 0.5: '½', 0.75: '¾' }
const PLURALS = { clove: 'cloves', can: 'cans', slice: 'slices', bunch: 'bunches', pinch: 'pinches', cup: 'cups' }

export function scaleQuantity(quantity, fromServings, toServings) {
  if (quantity == null) return null
  return (quantity * toServings) / fromServings
}

// Rounds to what a cook would actually measure. Never shows "0".
function roundForUnit(value, unit) {
  if (unit === 'g' || unit === 'ml') {
    const rounded = value < 20 ? Math.round(value) : Math.round(value / 5) * 5
    return Math.max(rounded, 1)
  }
  if (unit === 'kg' || unit === 'l') {
    return Math.max(Math.round(value * 100) / 100, 0.01)
  }
  return Math.max(Math.round(value * 4) / 4, 0.25)
}

function formatNumber(value, unit) {
  if (unit === 'g' || unit === 'ml' || unit === 'kg' || unit === 'l') return String(value)
  const whole = Math.floor(value)
  const glyph = QUARTER_GLYPHS[value - whole] ?? ''
  return whole === 0 ? glyph : `${whole}${glyph}`
}

// "clove" → "cloves" above 1; g, ml, tsp etc. never change.
export function unitLabel(unit, value) {
  return value > 1 && PLURALS[unit] ? PLURALS[unit] : unit
}

// 7 g → "7 g", 2 clove → "2 cloves", 0.5 tbsp → "½ tbsp", 4 (no unit) → "4". Null quantity → null.
export function formatAmount(value, unit) {
  if (value == null) return null
  const rounded = roundForUnit(value, unit)
  const number = formatNumber(rounded, unit)
  if (!unit) return number
  return `${number} ${unitLabel(unit, rounded)}`
}

// Ungrouped ingredients first, then each group in the order it first appears.
export function groupIngredients(ingredients) {
  const sorted = [...ingredients].sort((a, b) => a.position - b.position)
  const groups = new Map([[null, []]])
  for (const ing of sorted) {
    const key = ing.group ?? null
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(ing)
  }
  return [...groups].filter(([, items]) => items.length > 0).map(([group, items]) => ({ group, items }))
}
