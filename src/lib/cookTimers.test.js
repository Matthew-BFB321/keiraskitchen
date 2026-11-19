import { describe, it, expect } from 'vitest'
import { createTimer, remainingMs, pauseTimer, resumeTimer, isFinished, formatCountdown } from './cookTimers.js'

const T0 = 1_000_000

describe('cook timers', () => {
  it('works out remaining time from the end timestamp', () => {
    const timer = createTimer('r1', 's1', 600, T0)
    expect(timer.endsAt).toBe(T0 + 600_000)
    expect(remainingMs(timer, T0)).toBe(600_000)
    expect(remainingMs(timer, T0 + 1_000)).toBe(599_000)
  })

  it('stays correct after a big jump, as when the phone throttles the page', () => {
    const timer = createTimer('r1', 's1', 600, T0)
    expect(remainingMs(timer, T0 + 450_000)).toBe(150_000)
    expect(remainingMs(timer, T0 + 999_999)).toBe(0)
    expect(isFinished(timer, T0 + 999_999)).toBe(true)
  })

  it('freezes while paused and gets a new end time on resume', () => {
    const running = createTimer('r1', 's1', 300, T0)
    const paused = pauseTimer(running, T0 + 100_000)
    expect(paused.endsAt).toBeNull()
    expect(remainingMs(paused, T0 + 999_999)).toBe(200_000)
    expect(isFinished(paused, T0 + 999_999)).toBe(false)

    const resumed = resumeTimer(paused, T0 + 500_000)
    expect(resumed.endsAt).toBe(T0 + 700_000)
    expect(remainingMs(resumed, T0 + 600_000)).toBe(100_000)
  })

  it('is finished only once the end time is reached', () => {
    const timer = createTimer('r1', 's1', 60, T0)
    expect(isFinished(timer, T0 + 59_999)).toBe(false)
    expect(isFinished(timer, T0 + 60_000)).toBe(true)
  })

  it('formats the countdown, rounding up to whole seconds', () => {
    expect(formatCountdown(0)).toBe('0:00')
    expect(formatCountdown(545_000)).toBe('9:05')
    expect(formatCountdown(3_750_000)).toBe('1:02:30')
    expect(formatCountdown(59_001)).toBe('1:00')
    expect(formatCountdown(-5)).toBe('0:00')
  })
})
