import { newId } from './uuid.js'

/*
 * Pure timer maths. Remaining time is always worked out from the end
 * timestamp, never by counting down, so it stays right even when the phone
 * throttles or pauses the page.
 *
 * Running: endsAt set. Paused: endsAt null, remainingWhenPaused set.
 */

export function createTimer(recipeId, stepId, seconds, now) {
  const durationMs = seconds * 1000
  return { id: newId(), recipeId, stepId, durationMs, endsAt: now + durationMs, remainingWhenPaused: null }
}

export function remainingMs(timer, now) {
  if (timer.endsAt == null) return timer.remainingWhenPaused
  return Math.max(0, timer.endsAt - now)
}

export function pauseTimer(timer, now) {
  if (timer.endsAt == null) return timer
  return { ...timer, endsAt: null, remainingWhenPaused: remainingMs(timer, now) }
}

export function resumeTimer(timer, now) {
  if (timer.endsAt != null) return timer
  return { ...timer, endsAt: now + timer.remainingWhenPaused, remainingWhenPaused: null }
}

export function isFinished(timer, now) {
  return timer.endsAt != null && now >= timer.endsAt
}

// 545000 → "9:05", 3750000 → "1:02:30". Rounds up so it only shows 0:00 when done.
export function formatCountdown(ms) {
  const total = Math.ceil(Math.max(0, ms) / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}
