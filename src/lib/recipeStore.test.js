import { describe, it, expect, vi } from 'vitest'
import {
  getAllRecipes,
  getRecipe,
  toggleFavourite,
  subscribe,
  addRecipe,
  updateRecipe,
  deleteRecipe,
} from './recipeStore.js'
import { findTag, MAX_TAGS } from '../config/tags.js'

describe('recipeStore', () => {
  it('loads the 5 sample recipes', () => {
    expect(getAllRecipes()).toHaveLength(5)
  })

  it('finds a recipe by id, and returns null for an unknown id', () => {
    const first = getAllRecipes()[0]
    expect(getRecipe(first.id)).toBe(first)
    expect(getRecipe('not-a-real-id')).toBeNull()
  })

  it('toggles a favourite immutably and notifies subscribers', () => {
    const before = getAllRecipes()
    const target = before[0]
    const listener = vi.fn()
    const unsubscribe = subscribe(listener)

    toggleFavourite(target.id)
    const after = getAllRecipes()
    expect(after).not.toBe(before)
    expect(getRecipe(target.id).isFavourite).toBe(!target.isFavourite)
    expect(target.isFavourite).toBe(before[0].isFavourite) // original object untouched
    expect(listener).toHaveBeenCalledTimes(1)

    toggleFavourite(target.id)
    expect(getRecipe(target.id).isFavourite).toBe(target.isFavourite)
    unsubscribe()
    toggleFavourite(target.id)
    expect(listener).toHaveBeenCalledTimes(2)
    toggleFavourite(target.id) // restore
  })

  it('adds, updates and deletes recipes immutably, notifying subscribers', () => {
    const listener = vi.fn()
    const unsubscribe = subscribe(listener)
    const before = getAllRecipes()
    const recipe = { ...before[0], id: 'test-recipe', title: 'Test Soup' }

    addRecipe(recipe)
    expect(getAllRecipes()).not.toBe(before)
    expect(getAllRecipes()).toHaveLength(before.length + 1)
    expect(getRecipe('test-recipe').title).toBe('Test Soup')

    const afterAdd = getAllRecipes()
    updateRecipe({ ...recipe, title: 'Better Soup' })
    expect(getRecipe('test-recipe').title).toBe('Better Soup')
    expect(getAllRecipes()).not.toBe(afterAdd)
    expect(recipe.title).toBe('Test Soup') // original object untouched
    expect(getAllRecipes()).toHaveLength(before.length + 1)

    deleteRecipe('test-recipe')
    expect(getRecipe('test-recipe')).toBeNull()
    expect(getAllRecipes()).toEqual(before) // store back as it was
    expect(listener).toHaveBeenCalledTimes(3)
    unsubscribe()
  })

  it('sample recipes only use tags from the tag list, at most 3 each', () => {
    for (const r of getAllRecipes()) {
      expect(r.tags.length).toBeLessThanOrEqual(MAX_TAGS)
      for (const tag of r.tags) expect(findTag(tag), `${r.title}: ${tag}`).not.toBeNull()
    }
  })

  it('sample data matches the internal schema, including group and source', () => {
    for (const r of getAllRecipes()) {
      expect(r).toHaveProperty('source')
      for (const i of r.ingredients) expect(i).toHaveProperty('group')
    }
  })
})
