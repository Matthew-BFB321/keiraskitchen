import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getProgress,
  getAllTimers,
  subscribe,
  setServings,
  toggleDone,
  setCurrent,
  toggleGot,
  markDoneAndAdvance,
  startTimer,
  pauseTimer,
  resumeTimer,
  cancelTimer,
  dismissTimer,
  nextCurrent,
} from './cookProgress.js'
import { remainingMs } from './cookTimers.js'

const steps = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]

// The store lives for the whole session, so each test uses its own recipe id.
describe('cookProgress store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
  })
  afterEach(() => vi.useRealTimers())

  it('starts empty for a recipe it has not seen', () => {
    expect(getProgress('new')).toMatchObject({ servings: null, doneStepIds: [], currentStepId: null, timers: [] })
    expect(getProgress('new')).toBe(getProgress('new'))
  })

  it('tracks servings, ticks, current step and got-it ingredients per recipe', () => {
    setServings('r1', 3)
    toggleDone('r1', 'b')
    setCurrent('r1', 'c')
    toggleGot('r1', 'ing1')
    toggleDone('r2', 'a')

    expect(getProgress('r1')).toMatchObject({
      servings: 3,
      doneStepIds: ['b'],
      currentStepId: 'c',
      gotIngredientIds: ['ing1'],
    })
    expect(getProgress('r2').doneStepIds).toEqual(['a'])

    toggleDone('r1', 'b')
    toggleGot('r1', 'ing1')
    expect(getProgress('r1').doneStepIds).toEqual([])
    expect(getProgress('r1').gotIngredientIds).toEqual([])
  })

  it('"Done, next" ticks the current step and moves to the next unticked one', () => {
    expect(markDoneAndAdvance('r3', steps)).toBe('b') // current starts at the first step
    toggleDone('r3', 'c')
    expect(markDoneAndAdvance('r3', steps)).toBe('d')
    expect(getProgress('r3').doneStepIds).toEqual(['a', 'c', 'b'])
    markDoneAndAdvance('r3', steps)
    expect(getProgress('r3').doneStepIds).toHaveLength(4)
    expect(getProgress('r3').currentStepId).toBe('d') // all done: stays put
  })

  it('starts, pauses, resumes and cancels timers, notifying subscribers', () => {
    const listener = vi.fn()
    const unsubscribe = subscribe(listener)

    const timer = startTimer('r4', 'b', 600)
    expect(getProgress('r4').timers).toHaveLength(1)
    expect(listener).toHaveBeenCalledTimes(1)

    vi.setSystemTime(1_000_000 + 100_000)
    pauseTimer(timer.id)
    vi.setSystemTime(1_000_000 + 900_000)
    const paused = getProgress('r4').timers[0]
    expect(remainingMs(paused, Date.now())).toBe(500_000)

    resumeTimer(timer.id)
    expect(getProgress('r4').timers[0].endsAt).toBe(1_000_000 + 900_000 + 500_000)

    cancelTimer(timer.id)
    expect(getProgress('r4').timers).toEqual([])
    expect(listener).toHaveBeenCalledTimes(4)
    unsubscribe()
  })

  it('lists timers from every recipe, and keeps them between reads', () => {
    const t1 = startTimer('r5', 'a', 60)
    const t2 = startTimer('r6', 'c', 120)
    const mine = () => getAllTimers().filter((t) => t.recipeId === 'r5' || t.recipeId === 'r6')

    expect(mine().map((t) => t.id)).toEqual([t1.id, t2.id])
    expect(mine().map((t) => t.id)).toEqual([t1.id, t2.id])

    dismissTimer(t1.id)
    expect(mine().map((t) => t.id)).toEqual([t2.id])
    cancelTimer(t2.id)
    expect(mine()).toEqual([])
  })
})

describe('nextCurrent', () => {
  it('moves forward to the next unticked step', () => {
    expect(nextCurrent(steps, ['a'], 'a')).toBe('b')
    expect(nextCurrent(steps, ['a', 'b'], 'a')).toBe('c')
  })

  it('wraps round to earlier unticked steps', () => {
    expect(nextCurrent(steps, ['c', 'd'], 'c')).toBe('a')
  })

  it('returns null when every step is done', () => {
    expect(nextCurrent(steps, ['a', 'b', 'c', 'd'], 'b')).toBeNull()
  })
})
