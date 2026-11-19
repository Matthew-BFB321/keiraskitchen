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
  clearProgress,
  clearIfFinished,
  sessionStart,
  markActive,
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

describe('clearing progress between cooking sessions', () => {
  const T0 = 1_000_000
  const MIN = 60 * 1000
  const HOUR = 60 * MIN

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
  })
  afterEach(() => vi.useRealTimers())

  // A plain progress object, for the pure sessionStart decisions
  const progressWith = (overrides) => ({
    servings: 4,
    doneStepIds: [],
    currentStepId: null,
    gotIngredientIds: [],
    timers: [],
    lastActivity: T0,
    ...overrides,
  })

  it('records the time of every action as lastActivity', () => {
    toggleDone('c1', 'a')
    expect(getProgress('c1').lastActivity).toBe(T0)
    vi.setSystemTime(T0 + 5 * MIN)
    toggleGot('c1', 'ing1')
    expect(getProgress('c1').lastActivity).toBe(T0 + 5 * MIN)
    vi.setSystemTime(T0 + 50 * MIN)
    markActive('c1') // opening cook mode
    expect(getProgress('c1')).toMatchObject({ lastActivity: T0 + 50 * MIN, doneStepIds: ['a'] })
  })

  it('clearProgress resets ticks, current step and ingredient ticks, but keeps timers and servings', () => {
    setServings('c2', 3)
    toggleDone('c2', 'a')
    setCurrent('c2', 'b')
    toggleGot('c2', 'ing1')
    const timer = startTimer('c2', 'b', 600)

    clearProgress('c2')
    expect(getProgress('c2')).toMatchObject({ servings: 3, doneStepIds: [], currentStepId: null, gotIngredientIds: [] })
    expect(getProgress('c2').timers.map((t) => t.id)).toEqual([timer.id])
    cancelTimer(timer.id)
  })

  it('leaving after every step is ticked clears progress, keeping a running timer', () => {
    steps.forEach((s) => toggleDone('c3', s.id))
    const timer = startTimer('c3', 'd', 600)

    clearIfFinished('c3', steps)
    expect(getProgress('c3').doneStepIds).toEqual([])
    expect(getProgress('c3').timers.map((t) => t.id)).toEqual([timer.id])
    cancelTimer(timer.id)
  })

  it('leaving with steps still to do keeps progress', () => {
    toggleDone('c4', 'a')
    clearIfFinished('c4', steps)
    expect(getProgress('c4').doneStepIds).toEqual(['a'])
  })

  it('starts fresh when there is no progress', () => {
    expect(sessionStart(progressWith({}), steps, T0 + 5 * HOUR)).toBe('fresh')
  })

  it('asks after a gap of 30 minutes to 12 hours with partial progress', () => {
    const p = progressWith({ doneStepIds: ['a'] })
    expect(sessionStart(p, steps, T0 + 30 * MIN)).toBe('ask')
    expect(sessionStart(p, steps, T0 + 5 * HOUR)).toBe('ask')
    expect(sessionStart(p, steps, T0 + 12 * HOUR)).toBe('ask')
  })

  it('counts ingredient ticks alone as progress', () => {
    expect(sessionStart(progressWith({ gotIngredientIds: ['ing1'] }), steps, T0 + HOUR)).toBe('ask')
  })

  it('continues silently when back within 30 minutes', () => {
    const p = progressWith({ doneStepIds: ['a'] })
    expect(sessionStart(p, steps, T0 + 29 * MIN)).toBe('continue')
    expect(sessionStart(p, steps, T0)).toBe('continue')
  })

  it('continues silently when the recipe has a timer, even after a long gap', () => {
    const timer = { id: 't', recipeId: 'r', stepId: 'b', durationMs: 3 * HOUR, endsAt: T0 + 3 * HOUR, remainingWhenPaused: null }
    const p = progressWith({ doneStepIds: ['a'], timers: [timer] })
    expect(sessionStart(p, steps, T0 + 2 * HOUR)).toBe('continue')
  })

  it('resets automatically, with no question, after more than 12 hours', () => {
    const p = progressWith({ doneStepIds: ['a'] })
    expect(sessionStart(p, steps, T0 + 12 * HOUR + 1)).toBe('reset')
  })

  it('resets when every step is already done', () => {
    const p = progressWith({ doneStepIds: steps.map((s) => s.id) })
    expect(sessionStart(p, steps, T0 + MIN)).toBe('reset')
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
