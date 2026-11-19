import { useSyncExternalStore } from 'react'
import { createTimer, pauseTimer as pause, resumeTimer as resume } from './cookTimers.js'

/*
 * Cooking progress per recipe: ticks, current step, "got it" ingredients,
 * chosen servings and timers. Held in memory for the session, so it survives
 * leaving cook mode (Exit, back gesture, Library) but not a page reload.
 * Clearing progress never touches timers.
 *
 * Updates are immutable so React re-renders, like recipeStore.
 */

export const STALE_AFTER_MS = 12 * 60 * 60 * 1000
export const MID_COOK_MS = 30 * 60 * 1000

const EMPTY = Object.freeze({
  servings: null,
  doneStepIds: [],
  currentStepId: null,
  gotIngredientIds: [],
  timers: [],
  lastActivity: null,
})

let progress = {}
let allTimers = []
const listeners = new Set()

function notify() {
  listeners.forEach((listener) => listener())
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function update(recipeId, change) {
  progress = { ...progress, [recipeId]: { ...change(getProgress(recipeId)), lastActivity: Date.now() } }
  allTimers = Object.values(progress).flatMap((p) => p.timers)
  notify()
}

function updateTimer(timerId, change) {
  const timer = allTimers.find((t) => t.id === timerId)
  if (!timer) return
  update(timer.recipeId, (p) => ({
    ...p,
    timers: p.timers.flatMap((t) => (t.id === timerId ? [change(t)].filter(Boolean) : [t])),
  }))
}

function toggleIn(list, id) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

export function getProgress(recipeId) {
  return progress[recipeId] ?? EMPTY
}

export function getAllTimers() {
  return allTimers
}

export function setServings(recipeId, servings) {
  update(recipeId, (p) => ({ ...p, servings }))
}

export function toggleDone(recipeId, stepId) {
  update(recipeId, (p) => ({ ...p, doneStepIds: toggleIn(p.doneStepIds, stepId) }))
}

export function setCurrent(recipeId, stepId) {
  update(recipeId, (p) => ({ ...p, currentStepId: stepId }))
}

export function toggleGot(recipeId, ingredientId) {
  update(recipeId, (p) => ({ ...p, gotIngredientIds: toggleIn(p.gotIngredientIds, ingredientId) }))
}

// Opening cook mode counts as activity, so popping straight back doesn't ask again.
export function markActive(recipeId) {
  update(recipeId, (p) => p)
}

// Fresh start: clears ticks, current step and ingredient ticks. Keeps timers and servings.
export function clearProgress(recipeId) {
  update(recipeId, (p) => ({ ...p, doneStepIds: [], currentStepId: null, gotIngredientIds: [] }))
}

function allStepsDone(p, steps) {
  return steps.length > 0 && steps.every((s) => p.doneStepIds.includes(s.id))
}

// Called when she leaves cook mode: a finished cook shouldn't carry over to the next one.
export function clearIfFinished(recipeId, steps) {
  if (allStepsDone(getProgress(recipeId), steps)) clearProgress(recipeId)
}

/*
 * What to do when cook mode opens:
 *   'fresh'    nothing to resume
 *   'reset'    clear first: last activity over 12 hours ago, or every step already done
 *   'continue' carry on silently: back mid-cook (a timer exists or active < 30 min ago)
 *   'ask'      partial progress after a gap of 30 min to 12 hours: "Pick up where you left off?"
 */
export function sessionStart(p, steps, now) {
  const hasProgress = p.doneStepIds.length > 0 || p.gotIngredientIds.length > 0 || p.currentStepId != null
  if (!hasProgress) return 'fresh'
  const gap = p.lastActivity == null ? Infinity : now - p.lastActivity
  if (gap > STALE_AFTER_MS || allStepsDone(p, steps)) return 'reset'
  if (p.timers.length > 0 || gap < MID_COOK_MS) return 'continue'
  return 'ask'
}

// "Done, next": tick the current step and move to the next unticked one.
export function markDoneAndAdvance(recipeId, steps) {
  update(recipeId, (p) => {
    const current = p.currentStepId ?? steps[0]?.id
    const doneStepIds = p.doneStepIds.includes(current) ? p.doneStepIds : [...p.doneStepIds, current]
    return { ...p, doneStepIds, currentStepId: nextCurrent(steps, doneStepIds, current) ?? current }
  })
  return getProgress(recipeId).currentStepId
}

export function startTimer(recipeId, stepId, seconds) {
  const timer = createTimer(recipeId, stepId, seconds, Date.now())
  update(recipeId, (p) => ({ ...p, timers: [...p.timers, timer] }))
  return timer
}

export function pauseTimer(timerId) {
  updateTimer(timerId, (t) => pause(t, Date.now()))
}

export function resumeTimer(timerId) {
  updateTimer(timerId, (t) => resume(t, Date.now()))
}

export function cancelTimer(timerId) {
  updateTimer(timerId, () => null)
}

// Same as cancel; used when she stops the alarm of a finished timer.
export function dismissTimer(timerId) {
  updateTimer(timerId, () => null)
}

// Next unticked step after currentId, wrapping round to the start. Null when all done.
export function nextCurrent(steps, doneIds, currentId) {
  const start = steps.findIndex((s) => s.id === currentId)
  for (let i = 1; i <= steps.length; i++) {
    const step = steps[(start + i + steps.length) % steps.length]
    if (!doneIds.includes(step.id)) return step.id
  }
  return null
}

export function useCookProgress(recipeId) {
  return useSyncExternalStore(subscribe, () => getProgress(recipeId))
}

export function useAllTimers() {
  return useSyncExternalStore(subscribe, getAllTimers)
}
