import { describe, it, expect } from 'vitest'
import { filterRecipes, usedTags, sortByTitle, formatTotalTime } from './libraryFilters.js'

const recipe = (title, tags, items) => ({
  id: title,
  title,
  tags,
  ingredients: items.map((item) => ({ item })),
})

const recipes = [
  recipe('Bobotie', ['protein'], ['beef mince', 'onions']),
  recipe('Banana Bread', ['baking', 'quick'], ['bananas', 'cake flour']),
  recipe('Malva Pudding', ['baking'], ['apricot jam', 'cake flour']),
]
const titles = (list) => list.map((r) => r.title)

describe('filterRecipes', () => {
  it('returns everything with no search or tag', () => {
    expect(filterRecipes(recipes)).toHaveLength(3)
  })

  it('matches the title, ignoring case and spaces', () => {
    expect(titles(filterRecipes(recipes, { query: '  BOBO ' }))).toEqual(['Bobotie'])
  })

  it('matches an ingredient item', () => {
    expect(titles(filterRecipes(recipes, { query: 'flour' }))).toEqual(['Banana Bread', 'Malva Pudding'])
  })

  it('filters by tag', () => {
    expect(titles(filterRecipes(recipes, { tag: 'baking' }))).toEqual(['Banana Bread', 'Malva Pudding'])
  })

  it('combines tag and search', () => {
    expect(titles(filterRecipes(recipes, { tag: 'baking', query: 'jam' }))).toEqual(['Malva Pudding'])
    expect(filterRecipes(recipes, { tag: 'protein', query: 'jam' })).toEqual([])
  })
})

describe('usedTags and sortByTitle', () => {
  it('lists only tags in use, once each, in tag-list order with labels', () => {
    expect(usedTags(recipes)).toEqual([
      { id: 'protein', label: 'Protein' },
      { id: 'baking', label: 'Baking' },
      { id: 'quick', label: 'Quick' },
    ])
  })

  it('sorts by title without changing the original', () => {
    expect(titles(sortByTitle(recipes))).toEqual(['Banana Bread', 'Bobotie', 'Malva Pudding'])
    expect(recipes[0].title).toBe('Bobotie')
  })
})

describe('formatTotalTime', () => {
  it('formats minutes and hours', () => {
    expect(formatTotalTime(15, 30)).toBe('45 min')
    expect(formatTotalTime(20, 40)).toBe('1 h')
    expect(formatTotalTime(20, 75)).toBe('1 h 35 min')
  })

  it('treats a missing part as 0, and returns null when both are missing', () => {
    expect(formatTotalTime(null, 25)).toBe('25 min')
    expect(formatTotalTime(null, null)).toBeNull()
  })
})
