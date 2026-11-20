import { describe, it, expect } from 'vitest'
import { emptyForm, recipeToForm, saveForm, previewForm, formToImport } from './recipeForm.js'
import { getAllRecipes } from './recipeStore.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const sample = (title) => getAllRecipes().find((r) => r.title === title)

const filledForm = (overrides = {}) => ({
  ...emptyForm(),
  title: 'Toast',
  servings: 2,
  ingredientsText: '2 slices bread\n1 tbsp butter',
  stepsText: 'Toast the bread for 3 minutes.\nButter it.',
  ...overrides,
})

// What should survive a round trip: everything except ingredient and step ids
const content = (recipe) => ({
  ...recipe,
  ingredients: recipe.ingredients.map(({ id, ...rest }) => rest),
  steps: recipe.steps.map(({ id, ...rest }) => rest),
})

describe('recipe → text → recipe round trip', () => {
  it.each(getAllRecipes().map((r) => [r.title]))('%s comes back the same', (title) => {
    const original = sample(title)
    const result = saveForm(recipeToForm(original), original)
    expect(result.ok).toBe(true)

    const expected = content(original)
    // Known, intended differences: timers under 2 minutes are dropped (format rule),
    // and "2 slices white bread" now reads "slices" as the unit.
    expected.steps = expected.steps.map((s) => ({ ...s, timerSeconds: s.timerSeconds < 120 ? null : s.timerSeconds }))
    expected.ingredients = expected.ingredients.map((i) =>
      i.item === 'slices white bread' ? { ...i, unit: 'slice', item: 'white bread' } : i,
    )
    expect(content(result.recipe)).toEqual(expected)
  })

  it('keeps the recipe id, photo and favourite; ingredient and step ids are new', () => {
    const original = { ...sample('Malva Pudding'), photoUrl: 'https://example.com/m.jpg', isFavourite: true }
    const { recipe } = saveForm(recipeToForm(original), original)
    expect(recipe).toMatchObject({ id: original.id, photoUrl: 'https://example.com/m.jpg', isFavourite: true })
    recipe.ingredients.forEach((i) => expect(i.id).toMatch(UUID))
    expect(recipe.ingredients.map((i) => i.id)).not.toContain(original.ingredients[0].id)
  })

  it('writes Malva Pudding with a Sauce heading and an explicit timer', () => {
    const form = recipeToForm(sample('Malva Pudding'))
    expect(form.ingredientsText).toContain('\nSauce:\n250 ml fresh cream\n')
    expect(form.stepsText.split('\n')[1]).toBe('Beat the castor sugar and eggs until thick and pale, then beat in the jam. (timer 5 min)')
  })
})

describe('saveForm', () => {
  it('saves a new recipe with new UUIDs, positions and timers', () => {
    const { ok, recipe } = saveForm(filledForm())
    expect(ok).toBe(true)
    expect(recipe.id).toMatch(UUID)
    expect(recipe).toMatchObject({ title: 'Toast', servings: 2, photoUrl: null, isFavourite: false })
    expect(recipe.ingredients.map((i) => [i.position, i.quantity, i.unit, i.item])).toEqual([
      [1, 2, 'slice', 'bread'],
      [2, 1, 'tbsp', 'butter'],
    ])
    expect(recipe.steps.map((s) => [s.position, s.timerSeconds])).toEqual([
      [1, 180],
      [2, null],
    ])
  })

  it('applies the importer fixes to fractions and ranges', () => {
    const { recipe } = saveForm(filledForm({ ingredientsText: '1/2 tsp salt\n1 1/2 cups flour\n2-3 cloves garlic, crushed' }))
    expect(recipe.ingredients.map((i) => i.quantity)).toEqual([0.5, 1.5, 2])
    expect(recipe.ingredients[2].note).toBe('2-3; crushed')
  })

  it('gives lines under a heading that group', () => {
    const { recipe } = saveForm(filledForm({ ingredientsText: '2 eggs\nSauce:\n250 ml cream\n1 tbsp sugar' }))
    expect(recipe.ingredients.map((i) => i.group)).toEqual([null, 'Sauce', 'Sauce'])
  })

  it('ignores blank lines', () => {
    const { recipe } = saveForm(filledForm({ ingredientsText: '\n2 eggs\n\n   \n1 onion\n', stepsText: '\nBoil.\n\n' }))
    expect(recipe.ingredients.map((i) => i.item)).toEqual(['eggs', 'onion'])
    expect(recipe.steps).toHaveLength(1)
  })

  it('stores blank optional fields as null', () => {
    const { recipe } = saveForm(filledForm({ description: ' ', notes: '', source: '', prepMin: '', cookMin: '' }))
    expect(recipe).toMatchObject({ description: null, notes: null, source: null, prepMin: null, cookMin: null })
  })

  it('reports problems with the box and line number', () => {
    const { ok, errors } = saveForm(filledForm({ title: '', ingredientsText: '2 eggs\n\nSauce:\n250 ml', stepsText: 'Boil.\n(timer 5 min)' }))
    expect(ok).toBe(false)
    expect(errors).toEqual([
      { field: 'title', line: null, message: 'The recipe has no title.' },
      { field: 'ingredients', line: 4, message: 'Ingredient 2 has no name.' },
      { field: 'steps', line: 2, message: 'Step 2 has no instructions.' },
    ])
  })

  it('says when a box is empty', () => {
    const { errors } = saveForm(filledForm({ ingredientsText: '\n  \nSauce:', stepsText: '' }))
    expect(errors.map((e) => e.message)).toEqual(['The recipe has no ingredients.', 'The recipe has no steps.'])
  })

  it('saves a pre-filled draft as a new recipe', () => {
    const draft = { ...sample('Banana Bread'), id: undefined }
    const result = saveForm(recipeToForm(draft))
    expect(result.ok).toBe(true)
    expect(result.recipe.id).toMatch(UUID)
    expect(result.recipe.id).not.toBe(sample('Banana Bread').id)
  })
})

describe('previewForm', () => {
  it('shows each line as it will be saved, with headings and problems in place', () => {
    const preview = previewForm(
      filledForm({ ingredientsText: '500 g beef mince, browned\nSauce:\n2-3 cloves garlic\n2', stepsText: 'Simmer 10 minutes.\nServe.' }),
    )
    expect(preview.ingredients).toEqual([
      { line: 1, quantity: 500, unit: 'g', item: 'beef mince', note: 'browned', group: null, error: null },
      { line: 2, heading: 'Sauce' },
      { line: 3, quantity: 2, unit: 'clove', item: 'garlic', note: '2-3', group: 'Sauce', error: null },
      { line: 4, quantity: 2, unit: null, item: '', note: null, group: 'Sauce', error: 'Ingredient 3 has no name.' },
    ])
    expect(preview.steps).toEqual([
      { line: 1, text: 'Simmer 10 minutes.', timerSeconds: 600, error: null },
      { line: 2, text: 'Serve.', timerSeconds: null, error: null },
    ])
  })
})

describe('formToImport', () => {
  it('produces the import format the validator expects', () => {
    const data = formToImport(filledForm({ prepMin: '10', tags: ['quick'] }))
    expect(data).toMatchObject({ format: 'keiras-kitchen-recipe', version: 1, prepMin: 10, cookMin: null, tags: ['quick'] })
    expect(data.ingredients[0]).toEqual({ group: null, quantity: '2', unit: 'slice', item: 'bread', note: null })
    expect(data.steps[0]).toEqual({ text: 'Toast the bread for 3 minutes.', timerMin: 3 })
  })
})
