import { describe, it, expect } from 'vitest'
import samples from '../data/recipes.json'
import { toRow, fromRow, SCHEMA_VERSION } from './recipeRows.js'
import { findTag, MAX_TAGS } from '../config/tags.js'

describe('toRow / fromRow', () => {
  it('puts title and favourite in their own columns and the rest in data', () => {
    const [bobotie] = samples.recipes
    const row = toRow(bobotie)
    expect(row).toMatchObject({ id: bobotie.id, schema_version: SCHEMA_VERSION, title: 'Bobotie', is_favourite: true })
    expect(Object.keys(row.data).sort()).toEqual(
      ['cookMin', 'description', 'ingredients', 'notes', 'photoUrl', 'prepMin', 'servings', 'source', 'steps', 'tags'].sort(),
    )
    expect(row).not.toHaveProperty('user_id') // Supabase fills it in from the login
  })

  it.each(samples.recipes.map((r) => [r.title, r]))('%s survives a round trip', (_, recipe) => {
    expect(fromRow(toRow(recipe))).toEqual(recipe)
  })
})

describe('sample recipes (test data)', () => {
  it('only use tags from the tag list, at most 3 each', () => {
    for (const r of samples.recipes) {
      expect(r.tags.length).toBeLessThanOrEqual(MAX_TAGS)
      for (const tag of r.tags) expect(findTag(tag), `${r.title}: ${tag}`).not.toBeNull()
    }
  })

  it('match the internal schema, including group and source', () => {
    for (const r of samples.recipes) {
      expect(r).toHaveProperty('source')
      for (const i of r.ingredients) expect(i).toHaveProperty('group')
    }
  })
})
