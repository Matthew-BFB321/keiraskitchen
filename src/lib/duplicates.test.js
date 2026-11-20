import { describe, it, expect } from 'vitest'
import { findByTitle, copyTitle, replaceWith } from './duplicates.js'

const recipes = [
  { id: 'a', title: 'Bobotie' },
  { id: 'b', title: 'Malva Pudding' },
  { id: 'c', title: 'Banana Bread (2)' },
]

describe('findByTitle', () => {
  it('finds a recipe with the same title, ignoring case and outer spaces', () => {
    expect(findByTitle(recipes, 'Bobotie').id).toBe('a')
    expect(findByTitle(recipes, 'malva PUDDING').id).toBe('b')
    expect(findByTitle(recipes, '  Bobotie  ').id).toBe('a')
  })

  it('returns null when no title matches', () => {
    expect(findByTitle(recipes, 'Bobotie Pie')).toBeNull()
    expect(findByTitle([], 'Bobotie')).toBeNull()
  })
})

describe('copyTitle', () => {
  it('adds " (2)"', () => {
    expect(copyTitle(recipes, 'Bobotie')).toBe('Bobotie (2)')
  })

  it('moves on to the next free number, ignoring case', () => {
    expect(copyTitle([...recipes, { title: 'bobotie (2)' }], 'Bobotie')).toBe('Bobotie (3)')
    expect(copyTitle([...recipes, { title: 'Bobotie (2)' }, { title: 'BOBOTIE (3)' }], 'Bobotie')).toBe('Bobotie (4)')
    expect(copyTitle(recipes, 'Banana Bread')).toBe('Banana Bread (3)')
  })

  it('trims the title first', () => {
    expect(copyTitle(recipes, ' Bobotie ')).toBe('Bobotie (2)')
  })
})

describe('replaceWith', () => {
  const existing = {
    id: 'old-id',
    title: 'Bobotie',
    isFavourite: true,
    photoUrl: 'https://example.com/bobotie.jpg',
    notes: 'Old notes',
    ingredients: [{ id: 'i1', item: 'beef' }],
    steps: [{ id: 's1', text: 'Old step' }],
  }
  const incoming = {
    id: 'new-id',
    title: 'bobotie',
    isFavourite: false,
    photoUrl: null,
    notes: 'New notes',
    ingredients: [{ id: 'i9', item: 'lamb' }],
    steps: [{ id: 's9', text: 'New step' }],
  }

  it('keeps the id and favourite, and replaces everything else', () => {
    const result = replaceWith(existing, incoming)
    expect(result).toMatchObject({ id: 'old-id', isFavourite: true, title: 'bobotie', notes: 'New notes' })
    expect(result.ingredients).toEqual(incoming.ingredients)
    expect(result.steps).toEqual(incoming.steps)
  })

  it('keeps the existing photo when the new recipe has none', () => {
    expect(replaceWith(existing, incoming).photoUrl).toBe('https://example.com/bobotie.jpg')
  })

  it('uses the new photo when there is one', () => {
    expect(replaceWith(existing, { ...incoming, photoUrl: 'https://example.com/new.jpg' }).photoUrl).toBe(
      'https://example.com/new.jpg',
    )
  })

  it('works when the existing recipe has no photo either', () => {
    expect(replaceWith({ ...existing, photoUrl: null }, incoming).photoUrl).toBeNull()
  })
})
