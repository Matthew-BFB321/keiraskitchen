import { useEffect } from 'react'

// Keeps the screen on while the component is mounted. The browser drops the
// lock when the page is hidden, so it's re-acquired on return. Unsupported
// browsers (or plain-http pages) are ignored silently.
export function useWakeLock() {
  useEffect(() => {
    let lock = null
    let active = true

    async function acquire() {
      try {
        if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return
        const next = await navigator.wakeLock.request('screen')
        if (active) lock = next
        else next.release().catch(() => {})
      } catch {
        // not allowed or not supported
      }
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') acquire()
    }

    acquire()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', handleVisibility)
      lock?.release().catch(() => {})
    }
  }, [])
}
