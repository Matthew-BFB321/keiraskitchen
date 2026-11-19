import { describe, it, expect } from 'vitest'
import { scaleQuantity, formatAmount, groupIngredients } from './quantities.js'

describe('scaleQuantity', () => {
  it('scales by chosen servings over recipe servings', () => {
    expect(scaleQuantity(1000, 6, 3)).toBe(500)
    expect(scaleQuantity(2, 4, 6)).toBe(3)
  })

  it('leaves a null ("to taste") quantity as null', () => {
    expect(scaleQuantity(null, 4, 8)).toBeNull()
  })
})

describe('formatAmount', () => {
  it('g and ml: whole numbers below 20, nearest 5 from 20 up, never 0', () => {
    expect(formatAmount(7, 'g')).toBe('7 g')
    expect(formatAmount(19.4, 'g')).toBe('19 g')
    expect(formatAmount(23, 'g')).toBe('25 g')
    expect(formatAmount(187.5, 'ml')).toBe('190 ml')
    expect(formatAmount(0.3, 'g')).toBe('1 g')
  })

  it('kg and l: up to 2 decimals, trailing zeros removed', () => {
    expect(formatAmount(1.5, 'kg')).toBe('1.5 kg')
    expect(formatAmount(1.25, 'l')).toBe('1.25 l')
    expect(formatAmount(1 / 3, 'kg')).toBe('0.33 kg')
    expect(formatAmount(2.0, 'l')).toBe('2 l')
  })

  it('spoons, cups, counts and no unit: nearest quarter as a fraction, never 0', () => {
    expect(formatAmount(0.5, 'tsp')).toBe('½ tsp')
    expect(formatAmount(1.5, 'tbsp')).toBe('1½ tbsp')
    expect(formatAmount(0.1, 'pinch')).toBe('¼ pinch')
    expect(formatAmount(2.6, null)).toBe('2½')
    expect(formatAmount(2.9, null)).toBe('3')
    expect(formatAmount(0.75, 'cup')).toBe('¾ cup')
    expect(formatAmount(4, null)).toBe('4')
  })

  it('plural units read naturally', () => {
    expect(formatAmount(1, 'clove')).toBe('1 clove')
    expect(formatAmount(2, 'clove')).toBe('2 cloves')
    expect(formatAmount(2, 'can')).toBe('2 cans')
    expect(formatAmount(1.5, 'can')).toBe('1½ cans')
    expect(formatAmount(3, 'bunch')).toBe('3 bunches')
    expect(formatAmount(2, 'tbsp')).toBe('2 tbsp')
  })

  it('returns null for a null quantity', () => {
    expect(formatAmount(null, null)).toBeNull()
  })
})

describe('groupIngredients', () => {
  it('puts ungrouped first, then groups in order of first appearance, sorted by position', () => {
    const ings = [
      { id: 'd', position: 4, group: 'Sauce' },
      { id: 'a', position: 1, group: null },
      { id: 'c', position: 3, group: 'Topping' },
      { id: 'b', position: 2, group: 'Sauce' },
      { id: 'e', position: 5, group: null },
    ]
    expect(groupIngredients(ings).map((g) => [g.group, g.items.map((i) => i.id)])).toEqual([
      [null, ['a', 'e']],
      ['Sauce', ['b', 'd']],
      ['Topping', ['c']],
    ])
  })

  it('leaves out the ungrouped section when everything is grouped', () => {
    expect(groupIngredients([{ id: 'a', position: 1, group: 'Sauce' }]).map((g) => g.group)).toEqual(['Sauce'])
  })
})
