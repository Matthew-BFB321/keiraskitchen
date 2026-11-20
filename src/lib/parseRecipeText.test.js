import { describe, it, expect } from 'vitest'
import { parseIngredientLine, parseStepLine, detectTimerMinutes, ingredientsToText, stepsToText } from './parseRecipeText.js'

const ing = (quantityText, unit, item, note = null) => ({ kind: 'ingredient', quantityText, unit, item, note })

describe('parseIngredientLine', () => {
  it.each([
    ['2 eggs', ing('2', null, 'eggs')],
    ['500 g beef mince', ing('500', 'g', 'beef mince')],
    ['500g beef mince', ing('500', 'g', 'beef mince')],
    ['1.5 kg potatoes', ing('1.5', 'kg', 'potatoes')],
    ['1,5 l milk', ing('1,5', 'l', 'milk')],
    ['1/2 tsp salt', ing('1/2', 'tsp', 'salt')],
    ['1 1/2 cups flour', ing('1 1/2', 'cup', 'flour')],
    ['½ tsp cinnamon', ing('½', 'tsp', 'cinnamon')],
    ['1½ tbsp butter', ing('1½', 'tbsp', 'butter')],
    ['2-3 cloves garlic, crushed', ing('2-3', 'clove', 'garlic', 'crushed')],
    ['2 to 3 cloves garlic', ing('2 to 3', 'clove', 'garlic')],
    ['2 cups of flour', ing('2', 'cup', 'flour')],
    ['3 tablespoons olive oil', ing('3', 'tbsp', 'olive oil')],
    ['250 grams butter', ing('250', 'g', 'butter')],
    ['2 Tbsp. sugar', ing('2', 'tbsp', 'sugar')],
    ['salt and pepper, to taste', ing(null, null, 'salt and pepper', 'to taste')],
    ['pinch salt', ing(null, 'pinch', 'salt')],
  ])('reads "%s"', (line, expected) => {
    expect(parseIngredientLine(line)).toEqual(expected)
  })

  it('reads a line ending in ":" as a section heading', () => {
    expect(parseIngredientLine('Sauce:')).toEqual({ kind: 'heading', name: 'Sauce' })
    expect(parseIngredientLine('  For the topping:  ')).toEqual({ kind: 'heading', name: 'For the topping' })
  })

  it('ignores blank lines and a lone colon', () => {
    expect(parseIngredientLine('')).toEqual({ kind: 'blank' })
    expect(parseIngredientLine('   ')).toEqual({ kind: 'blank' })
    expect(parseIngredientLine(':')).toEqual({ kind: 'blank' })
  })

  it('handles odd input without crashing', () => {
    expect(parseIngredientLine('- 2 eggs')).toEqual(ing('2', null, 'eggs')) // bullet
    expect(parseIngredientLine('• 1 onion')).toEqual(ing('1', null, 'onion'))
    expect(parseIngredientLine('2')).toEqual(ing('2', null, '')) // validator reports "no name"
    expect(parseIngredientLine('½ tsp')).toEqual(ing('½', 'tsp', ''))
    expect(parseIngredientLine(', just a note')).toEqual(ing(null, null, '', 'just a note'))
    expect(parseIngredientLine('2 sprigs thyme')).toEqual(ing('2', null, 'sprigs thyme')) // unknown unit stays in item
    expect(parseIngredientLine('1 whole chicken')).toEqual(ing('1', null, 'whole chicken'))
    expect(parseIngredientLine('1 tomato')).toEqual(ing('1', null, 'tomato'))
    expect(parseIngredientLine('pinch')).toEqual(ing(null, null, 'pinch')) // unit word alone is the item
    expect(parseIngredientLine('2 peppers, any colour, cut into chunks')).toEqual(
      ing('2', null, 'peppers', 'any colour, cut into chunks'),
    )
    expect(parseIngredientLine('   400 g    tinned tomatoes ,  drained ')).toEqual(ing('400', 'g', 'tinned tomatoes', 'drained'))
  })
})

describe('detectTimerMinutes', () => {
  it.each([
    ['Simmer for 10 minutes.', 10],
    ['Simmer 10 min', 10],
    ['Rest 5 mins', 5],
    ['Bake 25m until golden', 25],
    ['Bake for 1 hour', 60],
    ['Roast 2 hrs', 120],
    ['Cook 1 hr 30 min', 90],
    ['Braise for 1 hour and 30 minutes', 90],
    ['Leave for an hour', 60],
    ['Chill for half an hour', 30],
    ['Bake 1½ hours', 90],
    ['Simmer 10-15 minutes', 10],
    ['Stir for 1 minute', 1],
    ['Fry 8 minutes, then rest 5 minutes', 8],
  ])('"%s" → %s min', (text, minutes) => {
    expect(detectTimerMinutes(text)).toBe(minutes)
  })

  it('finds no time where there is none', () => {
    expect(detectTimerMinutes('Stir for 30 seconds.')).toBeNull()
    expect(detectTimerMinutes('Add 200 ml milk and 2 eggs.')).toBeNull()
    expect(detectTimerMinutes('Grease a 20 × 20 cm dish and preheat to 180 °C.')).toBeNull()
    expect(detectTimerMinutes('Serve hot.')).toBeNull()
  })
})

describe('parseStepLine', () => {
  it('strips leading step numbers', () => {
    expect(parseStepLine('1. Heat the oil.')).toEqual({ kind: 'step', text: 'Heat the oil.', timerMin: null })
    expect(parseStepLine('Step 2: Add the onions.')).toEqual({ kind: 'step', text: 'Add the onions.', timerMin: null })
    expect(parseStepLine('1.5 litres of water goes in.').text).toBe('1.5 litres of water goes in.')
  })

  it('sets a timer of 2 minutes or more from the text', () => {
    expect(parseStepLine('Simmer for 10 minutes.').timerMin).toBe(10)
    expect(parseStepLine('Fry for 1 minute.').timerMin).toBeNull()
    expect(parseStepLine('Stir in the cheese.').timerMin).toBeNull()
  })

  it('reads "(timer …)" and "(no timer)" at the end and removes them from the text', () => {
    expect(parseStepLine('Beat until pale. (timer 5 min)')).toEqual({ kind: 'step', text: 'Beat until pale.', timerMin: 5 })
    expect(parseStepLine('Bake. Cover after 40 minutes. (timer 1 h)')).toEqual({
      kind: 'step',
      text: 'Bake. Cover after 40 minutes.',
      timerMin: 60,
    })
    expect(parseStepLine('Rest 10 minutes before slicing. (no timer)')).toEqual({
      kind: 'step',
      text: 'Rest 10 minutes before slicing.',
      timerMin: null,
    })
  })

  it('ignores blank lines', () => {
    expect(parseStepLine('  ')).toEqual({ kind: 'blank' })
  })
})

describe('ingredientsToText and stepsToText', () => {
  it('writes headings, plain quantities, natural units and notes', () => {
    const text = ingredientsToText([
      { position: 1, quantity: 0.5, unit: 'tsp', item: 'salt', note: null, group: null },
      { position: 2, quantity: 2, unit: 'clove', item: 'garlic', note: 'crushed', group: null },
      { position: 3, quantity: null, unit: null, item: 'salt and pepper', note: 'to taste', group: null },
      { position: 4, quantity: 250, unit: 'ml', item: 'cream', note: null, group: 'Sauce' },
    ])
    expect(text).toBe('0.5 tsp salt\n2 cloves garlic, crushed\nsalt and pepper, to taste\nSauce:\n250 ml cream')
  })

  it('adds a timer mark only when the text alone would not give the saved timer', () => {
    const text = stepsToText([
      { position: 1, text: 'Simmer for 10 minutes.', timerSeconds: 600 },
      { position: 2, text: 'Beat until pale.', timerSeconds: 300 },
      { position: 3, text: 'Rest 10 minutes before slicing.', timerSeconds: null },
      { position: 4, text: 'Stir.', timerSeconds: null },
    ])
    expect(text).toBe(
      'Simmer for 10 minutes.\nBeat until pale. (timer 5 min)\nRest 10 minutes before slicing. (no timer)\nStir.',
    )
  })
})
