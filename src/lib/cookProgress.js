import { useSyncExternalStore } from 'react'
import { createTimer, pauseTimer as pause, resumeTimer as resume } from './cookTimers.js'

/*
 * Cooking progress per recipe: ticks, current step, "got it" ingredients,
 * chosen servings and timers. Held in memory for the session, so it survives
 * leaving cook mode (Exit, back gesture, Library) but not a page reload.
 *
 * Updates are immutable so React re-renders, like recipeStore.
 */

const EMPTY = Object.freeze({
  servings: null,
  doneStepIds: [],
  currentStepId: null,
  gotIngredientIds: [],
  timers: [],
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
  progress = { ...progress, [recipeId]: change(getProgress(recipeId)) }
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
