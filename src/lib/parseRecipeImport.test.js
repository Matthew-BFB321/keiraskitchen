import { describe, it, expect } from 'vitest'
import { parseRecipeImport } from './parseRecipeImport.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

// The example from docs/recipe-format.md
const shakshuka = () => ({
  format: 'keiras-kitchen-recipe',
  version: 1,
  title: 'Shakshuka',
  description: 'Eggs poached in a spiced tomato and pepper sauce.',
  servings: 2,
  prepMin: 10,
  cookMin: 20,
  tags: ['quick'],
  ingredients: [
    { group: null, quantity: 1, unit: 'tbsp', item: 'olive oil', note: null },
    { group: null, quantity: 1, unit: null, item: 'onion', note: 'finely chopped' },
    { group: null, quantity: 1, unit: 'can', item: 'chopped tomatoes', note: '400 g' },
    { group: null, quantity: 4, unit: null, item: 'eggs', note: null },
    { group: null, quantity: null, unit: null, item: 'salt and pepper', note: 'to taste' },
  ],
  steps: [
    { text: 'Heat the oil and fry the onion until soft.', timerMin: 5 },
    { text: 'Add the tomatoes and simmer until thickened.', timerMin: 10 },
    { text: 'Make four wells, crack in the eggs, cover and cook until set.', timerMin: 6 },
  ],
  notes: 'Add feta at the end if you have it.',
  source: 'ChatGPT',
})

const parse = (obj) => parseRecipeImport(JSON.stringify(obj))

describe('parseRecipeImport', () => {
  it('accepts a valid recipe and converts it to the internal schema', () => {
    const result = parse(shakshuka())
    expect(result.ok).toBe(true)
    expect(result.fixes).toEqual([])

    const r = result.recipe
    expect(r.id).toMatch(UUID)
    expect(r).toMatchObject({
      title: 'Shakshuka',
      servings: 2,
      prepMin: 10,
      cookMin: 20,
      tags: ['quick'],
      photoUrl: null,
      isFavourite: false,
      source: 'ChatGPT',
      notes: 'Add feta at the end if you have it.',
    })

    expect(r.ingredients.map((i) => i.position)).toEqual([1, 2, 3, 4, 5])
    expect(r.ingredients[1]).toMatchObject({ quantity: 1, unit: null, item: 'onion', note: 'finely chopped', group: null })
    expect(r.ingredients[4].quantity).toBeNull()

    expect(r.steps.map((s) => s.position)).toEqual([1, 2, 3])
    expect(r.steps.map((s) => s.timerSeconds)).toEqual([300, 600, 360])
    expect(r.steps[0]).not.toHaveProperty('timerMin')

    const ids = [r.id, ...r.ingredients.map((i) => i.id), ...r.steps.map((s) => s.id)]
    ids.forEach((id) => expect(id).toMatch(UUID))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('reads a recipe wrapped in a ```json code block', () => {
    const result = parseRecipeImport('```json\n' + JSON.stringify(shakshuka(), null, 2) + '\n```')
    expect(result.ok).toBe(true)
    expect(result.recipe.title).toBe('Shakshuka')
  })

  it('ignores stray text around the recipe', () => {
    const text = `Here's your recipe in the format you asked for:\n\n${JSON.stringify(shakshuka())}\n\nEnjoy! Let me know if you want changes.`
    const result = parseRecipeImport(text)
    expect(result.ok).toBe(true)
    expect(result.recipe.title).toBe('Shakshuka')
  })

  it('rejects the wrong format', () => {
    const result = parse({ ...shakshuka(), format: 'some-other-app' })
    expect(result.ok).toBe(false)
    expect(result.errors).toEqual([expect.stringContaining("isn't a Keira's Kitchen recipe")])
  })

  it('rejects the wrong version', () => {
    const result = parse({ ...shakshuka(), version: 2 })
    expect(result.ok).toBe(false)
    expect(result.errors).toEqual([expect.stringContaining('format version 2')])
  })

  it('converts fraction quantities to decimals and lists the fix', () => {
    const recipe = shakshuka()
    recipe.ingredients[0].quantity = '1/2'
    recipe.ingredients[1].quantity = '1 1/2'
    recipe.ingredients[3].quantity = '½'
    const result = parse(recipe)
    expect(result.ok).toBe(true)
    expect(result.recipe.ingredients.map((i) => i.quantity).slice(0, 4)).toEqual([0.5, 1.5, 1, 0.5])
    expect(result.fixes).toEqual([
      'Ingredient 1 (olive oil): changed the amount "1/2" to 0.5.',
      'Ingredient 2 (onion): changed the amount "1 1/2" to 1.5.',
      'Ingredient 4 (eggs): changed the amount "½" to 0.5.',
    ])
  })

  it('uses the first number of a range and keeps the range in the note', () => {
    const recipe = shakshuka()
    recipe.ingredients[1].quantity = '2-3'
    const result = parse(recipe)
    expect(result.ok).toBe(true)
    expect(result.recipe.ingredients[1]).toMatchObject({ quantity: 2, note: '2-3; finely chopped' })
    expect(result.fixes).toEqual([expect.stringContaining('is a range')])
  })

  it('fixes units with an obvious meaning ("whole", "cups") and lists them', () => {
    const recipe = shakshuka()
    recipe.ingredients[1].unit = 'whole'
    recipe.ingredients[2].unit = 'cups'
    const result = parse(recipe)
    expect(result.ok).toBe(true)
    expect(result.recipe.ingredients[1].unit).toBeNull()
    expect(result.recipe.ingredients[2].unit).toBe('cup')
    expect(result.fixes).toEqual([
      'Ingredient 2 (onion): removed the unit "whole" (whole items have no unit).',
      'Ingredient 3 (chopped tomatoes): changed the unit "cups" to "cup".',
    ])
  })

  it('moves an unknown unit into the note instead of rejecting it', () => {
    const recipe = shakshuka()
    recipe.ingredients.push({ group: null, quantity: 2, unit: 'sprig', item: 'thyme', note: null })
    recipe.ingredients[1].unit = 'handful'
    const result = parse(recipe)
    expect(result.ok).toBe(true)
    expect(result.recipe.ingredients[5]).toMatchObject({ quantity: 2, unit: null, note: 'sprig' })
    expect(result.recipe.ingredients[1]).toMatchObject({ unit: null, note: 'handful; finely chopped' })
    expect(result.fixes).toContain('Ingredient 6 (thyme): the app doesn\'t know the unit "sprig", so it was moved into the note.')
  })

  it('matches tags to the tag list ignoring case, without listing a fix', () => {
    const result = parse({ ...shakshuka(), tags: ['Pasta', ' CREAMY '] })
    expect(result.ok).toBe(true)
    expect(result.recipe.tags).toEqual(['pasta', 'creamy'])
    expect(result.fixes).toEqual([])
  })

  it('removes tags that are not on the tag list and lists each one', () => {
    const result = parse({ ...shakshuka(), tags: ['dinner', 'quick', 'vegetarian'] })
    expect(result.ok).toBe(true)
    expect(result.recipe.tags).toEqual(['quick'])
    expect(result.fixes).toEqual([
      'Removed tag "dinner" (not in the tag list).',
      'Removed tag "vegetarian" (not in the tag list).',
    ])
  })

  it('keeps at most 3 tags', () => {
    const result = parse({ ...shakshuka(), tags: ['pasta', 'quick', 'creamy', 'protein'] })
    expect(result.ok).toBe(true)
    expect(result.recipe.tags).toEqual(['pasta', 'quick', 'creamy'])
    expect(result.fixes).toEqual(['Only 3 tags are allowed; kept the first 3 and dropped "protein".'])
  })

  it('accepts an empty or missing tag list', () => {
    const empty = parse({ ...shakshuka(), tags: [] })
    expect(empty.ok).toBe(true)
    expect(empty.recipe.tags).toEqual([])
    expect(empty.fixes).toEqual([])

    const { tags, ...noTags } = shakshuka()
    const missing = parse(noTags)
    expect(missing.ok).toBe(true)
    expect(missing.recipe.tags).toEqual([])
    expect(missing.fixes).toEqual([])
  })

  it('rejects a recipe with no title', () => {
    const { title, ...recipe } = shakshuka()
    const result = parse(recipe)
    expect(result.ok).toBe(false)
    expect(result.errors).toEqual(['The recipe has no title.'])
  })

  it('rejects an empty paste', () => {
    expect(parseRecipeImport('')).toEqual({ ok: false, errors: ['Nothing was pasted.'] })
    expect(parseRecipeImport('   \n  ')).toEqual({ ok: false, errors: ['Nothing was pasted.'] })
  })

  it('reports every problem at once, in plain language', () => {
    const recipe = shakshuka()
    recipe.title = ''
    recipe.servings = 'lots'
    recipe.ingredients[2].item = ''
    recipe.ingredients[3].quantity = 'a handful'
    recipe.steps[1].text = ''
    const result = parse(recipe)
    expect(result.ok).toBe(false)
    expect(result.errors).toEqual([
      'The recipe has no title.',
      'Servings must be a whole number like 4.',
      'Ingredient 3 has no name.',
      'Ingredient 4\'s amount "a handful" isn\'t a number.',
      'Step 2 has no instructions.',
    ])
  })

  it('explains when the pasted text has no recipe data or is cut off', () => {
    expect(parseRecipeImport('Sorry, I can only help with that later.').errors[0]).toMatch(/Couldn't find any recipe data/)
    expect(parseRecipeImport('{"format":"keiras-kitchen-recipe","title":"Shak}').errors[0]).toMatch(/incomplete or broken/)
  })

  it('removes step numbers and short timers, but leaves amounts at the start of a step alone', () => {
    const recipe = shakshuka()
    recipe.steps[0].text = '1. Heat the oil and fry the onion until soft.'
    recipe.steps[1] = { text: '1.5 litres of water goes in next.', timerMin: 1 }
    const result = parse(recipe)
    expect(result.ok).toBe(true)
    expect(result.recipe.steps[0].text).toBe('Heat the oil and fry the onion until soft.')
    expect(result.recipe.steps[1]).toMatchObject({ text: '1.5 litres of water goes in next.', timerSeconds: null })
    expect(result.fixes).toEqual([
      'Step 1: removed "1." from the start.',
      'Step 2: removed the 1-minute timer (timers are only for 2 minutes or more).',
    ])
  })
})
