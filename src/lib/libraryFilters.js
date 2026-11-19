import { TAGS } from '../config/tags.js'

// Pure helpers for the Library screen.

// Search matches title OR any ingredient item, case-insensitive. tag null = All.
export function filterRecipes(recipes, { query = '', tag = null } = {}) {
  const q = query.trim().toLowerCase()
  return recipes.filter((r) => {
    if (tag && !r.tags.includes(tag)) return false
    if (!q) return true
    return r.title.toLowerCase().includes(q) || r.ingredients.some((i) => i.item.toLowerCase().includes(q))
  })
}

// Tags from the fixed list that at least one recipe uses, in list order.
export function usedTags(recipes) {
  const used = new Set(recipes.flatMap((r) => r.tags))
  return TAGS.filter((t) => used.has(t.id))
}

export function sortByTitle(recipes) {
  return [...recipes].sort((a, b) => a.title.localeCompare(b.title))
}

// 45 → "45 min", 60 → "1 h", 95 → "1 h 35 min". Null when no times are known.
export function formatTotalTime(prepMin, cookMin) {
  if (prepMin == null && cookMin == null) return null
  const total = (prepMin ?? 0) + (cookMin ?? 0)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}
