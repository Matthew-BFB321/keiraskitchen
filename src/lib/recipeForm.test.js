import { describe, it, expect } from 'vitest'
import {
  emptyForm,
  recipeToForm,
  saveForm,
  formToImport,
  newIngredientRow,
  newSectionRow,
  newStepRow,
} from './recipeForm.js'
import { getAllRecipes } from './recipeStore.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const malva = () => getAllRecipes().find((r) => r.title === 'Malva Pudding')

const ing = (fields) => ({ ...newIngredientRow(), ...fields })
const section = (name) => ({ ...newSectionRow(), name })
const step = (fields) => ({ ...newStepRow(), ...fields })

// A small valid form to change per test
const filledForm = (overrides = {}) => ({
  ...emptyForm(),
  title: 'Toast',
  servings: 2,
  rows: [ing({ quantity: '2', item: 'bread slices' }), ing({ quantity: '1', unit: 'tbsp', item: 'butter' })],
  steps: [step({ text: 'Toast the bread.', timerMin: '3' }), step({ text: 'Butter it.' })],
  ...overrides,
})

describe('recipeToForm', () => {
  it('turns ingredient groups into section headings', () => {
    const form = recipeToForm(malva())
    const sauceAt = form.rows.findIndex((r) => r.kind === 'section')
    expect(form.rows[sauceAt].name).toBe('Sauce')
    expect(form.rows.filter((r) => r.kind === 'section')).toHaveLength(1)
    expect(form.rows.slice(sauceAt + 1).map((r) => r.item)).toEqual(['fresh cream', 'butter', 'sugar', 'hot water'])
    expect(form.rows[0]).toMatchObject({ kind: 'ingredient', quantity: '200', unit: 'g', item: 'castor sugar' })
  })

  it('shows timers in minutes', () => {
    const form = recipeToForm(malva())
    expect(form.steps[1].timerMin).toBe('5')
    expect(form.steps[0].timerMin).toBe('')
  })
})

describe('saveForm', () => {
  it('round-trips an existing recipe, keeping every UUID and all content', () => {
    const original = malva()
    const result = saveForm(recipeToForm(original), original)
    expect(result.ok).toBe(true)
    expect(result.recipe).toEqual(original)
  })

  it('gives new rows new UUIDs while keeping the existing ones', () => {
    const original = malva()
    const form = recipeToForm(original)
    form.rows.push(ing({ quantity: '1', unit: 'pinch', item: 'nutmeg' }))
    form.steps.push(step({ text: 'Serve with custard.' }))

    const { recipe } = saveForm(form, original)
    expect(recipe.id).toBe(original.id)
    expect(recipe.ingredients.slice(0, -1).map((i) => i.id)).toEqual(original.ingredients.map((i) => i.id))
    expect(recipe.steps.slice(0, -1).map((s) => s.id)).toEqual(original.steps.map((s) => s.id))

    const added = [recipe.ingredients.at(-1).id, recipe.steps.at(-1).id]
    added.forEach((id) => expect(id).toMatch(UUID))
    expect(original.ingredients.map((i) => i.id)).not.toContain(added[0])
    expect(recipe.ingredients.at(-1)).toMatchObject({ item: 'nutmeg', group: 'Sauce' }) // falls under the last heading
  })

  it('keeps photo and favourite when editing', () => {
    const original = { ...malva(), photoUrl: 'https://example.com/malva.jpg', isFavourite: true }
    const { recipe } = saveForm(recipeToForm(original), original)
    expect(recipe).toMatchObject({ photoUrl: 'https://example.com/malva.jpg', isFavourite: true })
  })

  it('saves a new recipe with new UUIDs and positions', () => {
    const { ok, recipe } = saveForm(filledForm())
    expect(ok).toBe(true)
    expect(recipe.id).toMatch(UUID)
    expect(recipe).toMatchObject({ title: 'Toast', servings: 2, photoUrl: null, isFavourite: false })
    expect(recipe.ingredients.map((i) => i.position)).toEqual([1, 2])
    expect(recipe.steps.map((s) => [s.position, s.timerSeconds])).toEqual([
      [1, 180],
      [2, null],
    ])
  })

  it('applies the importer fixes to quantities: fractions and ranges', () => {
    const form = filledForm({
      rows: [
        ing({ quantity: '1/2', unit: 'tsp', item: 'salt' }),
        ing({ quantity: '1 1/2', unit: 'cup', item: 'flour' }),
        ing({ quantity: '2-3', unit: 'clove', item: 'garlic', note: 'crushed' }),
      ],
    })
    const { recipe } = saveForm(form)
    expect(recipe.ingredients.map((i) => i.quantity)).toEqual([0.5, 1.5, 2])
    expect(recipe.ingredients[2].note).toBe('2-3; crushed')
  })

  it('sets each ingredient group from the heading above it', () => {
    const form = filledForm({
      rows: [ing({ item: 'eggs', quantity: '2' }), section('Sauce'), ing({ item: 'cream', quantity: '250', unit: 'ml' })],
    })
    const { recipe } = saveForm(form)
    expect(recipe.ingredients.map((i) => i.group)).toEqual([null, 'Sauce'])
  })

  it('stores blank optional fields as null', () => {
    const { recipe } = saveForm(filledForm({ description: '  ', notes: '', source: '', prepMin: '', cookMin: '' }))
    expect(recipe).toMatchObject({ description: null, notes: null, source: null, prepMin: null, cookMin: null })
    expect(recipe.ingredients[0]).toMatchObject({ unit: null, note: null })
  })

  it('attaches errors to the right field and row', () => {
    const form = filledForm({ title: '' })
    form.rows[1].item = ''
    form.steps[0].text = ''
    const { ok, errors } = saveForm(form)
    expect(ok).toBe(false)
    expect(errors).toEqual([
      { field: 'title', key: null, message: 'The recipe has no title.' },
      { field: 'item', key: form.rows[1].key, message: 'Ingredient 2 has no name.' },
      { field: 'text', key: form.steps[0].key, message: 'Step 1 has no instructions.' },
    ])
  })

  it('maps errors to the right row even with headings and dropped rows in between', () => {
    const form = filledForm({
      rows: [ing({ item: 'eggs' }), ing(), section('Sauce'), ing({ quantity: '2' })],
    })
    const { errors } = saveForm(form)
    expect(errors).toEqual([{ field: 'item', key: form.rows[3].key, message: 'Ingredient 2 has no name.' }])
  })

  it('reports a nameless section heading that has ingredients under it', () => {
    const form = filledForm({ rows: [ing({ item: 'eggs' }), section('  '), ing({ item: 'cream' })] })
    const { errors } = saveForm(form)
    expect(errors).toEqual([{ field: 'name', key: form.rows[1].key, message: 'Section has no name.' }])
  })

  it('silently drops blank ingredient rows, blank steps and empty nameless headings', () => {
    const form = filledForm()
    form.rows.splice(1, 0, ing())
    form.rows.push(section(''), ing({ unit: '' }))
    form.steps.push(step(), step({ text: '   ', timerMin: '' }))

    const result = saveForm(form)
    expect(result.ok).toBe(true)
    expect(result.recipe.ingredients.map((i) => i.item)).toEqual(['bread slices', 'butter'])
    expect(result.recipe.steps).toHaveLength(2)
  })

  it('still reports rows with some content but missing required parts', () => {
    const form = filledForm()
    form.rows.push(ing({ quantity: '2' }))
    form.steps.push(step({ timerMin: '10' }))
    const { errors } = saveForm(form)
    expect(errors.map((e) => e.message)).toEqual(['Ingredient 3 has no name.', 'Step 3 has no instructions.'])
  })

  it('says the recipe has no ingredients when every ingredient row is blank', () => {
    const { errors } = saveForm(filledForm({ rows: [ing(), section(''), ing()] }))
    expect(errors).toEqual([{ field: 'ingredients', key: null, message: 'The recipe has no ingredients.' }])
  })

  it('saves a pre-filled draft as a new recipe', () => {
    const draft = { ...malva(), id: undefined, isFavourite: false }
    const result = saveForm(recipeToForm(draft))
    expect(result.ok).toBe(true)
    expect(result.recipe.id).toMatch(UUID)
    expect(result.recipe.id).not.toBe(malva().id)
    expect(result.recipe.title).toBe('Malva Pudding')
  })
})

describe('formToImport', () => {
  it('produces the import format the validator expects', () => {
    const data = formToImport(filledForm({ prepMin: '10', tags: ['quick'] }))
    expect(data).toMatchObject({
      format: 'keiras-kitchen-recipe',
      version: 1,
      prepMin: 10,
      cookMin: null,
      tags: ['quick'],
      steps: [{ text: 'Toast the bread.', timerMin: 3 }, { text: 'Butter it.', timerMin: null }],
    })
    expect(data.ingredients[0]).toEqual({ group: null, quantity: '2', unit: null, item: 'bread slices', note: null })
  })
})
