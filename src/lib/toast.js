import { useSyncExternalStore } from 'react'

// One app-styled message at a time, shown by <Toast /> (mounted in App).
// Use instead of alert(). Closes after 4 seconds or on a tap.

const SHOW_MS = 4000
let current = null
let nextId = 1
const listeners = new Set()

function notify() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function showToast(message) {
  const id = nextId++
  current = { id, message }
  notify()
  setTimeout(() => {
    if (current?.id === id) dismissToast()
  }, SHOW_MS)
}

export function dismissToast() {
  current = null
  notify()
}

export function getToast() {
  return current
}

export function useToast() {
  return useSyncExternalStore(subscribe, getToast)
}
