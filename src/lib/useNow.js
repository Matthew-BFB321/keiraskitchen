import { useEffect, useState } from 'react'

// Re-renders every 250 ms while `active` (and straight away when the page
// becomes visible again) and returns the current time. Only drives the
// display; timers themselves are worked out from their end timestamps.
export function useNow(active) {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!active) return
    const tick = () => setTick((n) => n + 1)
    const id = setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [active])

  return Date.now()
}
