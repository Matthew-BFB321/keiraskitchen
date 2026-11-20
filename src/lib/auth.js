import { useSyncExternalStore } from 'react'
import { supabase } from './supabase.js'
import { readCache, clearRecipes } from './recipeStore.js'

/*
 * Login state for the whole app:
 *   'loading'  checking for a saved session
 *   'in'       logged in
 *   'offline'  no usable session and no connection, but recipes are saved on
 *              this phone: open read only rather than demand a login
 *   'out'      needs to log in
 * The session itself is kept by supabase-js (localStorage) and refreshed
 * automatically, so she stays logged in on her phone.
 */

let state = { status: 'loading', user: null }
let started = false
const listeners = new Set()

function set(next) {
  state = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  start()
  return () => listeners.delete(listener)
}

function isNetworkError(error) {
  if (!error) return false
  const message = String(error.message ?? '').toLowerCase()
  return error.name === 'AuthRetryableFetchError' || message.includes('fetch') || message.includes('network')
}

const browserOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false

function resolveSession(session, error) {
  if (session) {
    set({ status: 'in', user: session.user })
    return
  }
  const cache = readCache()
  if (cache?.userId && (browserOffline() || isNetworkError(error))) {
    set({ status: 'offline', user: { id: cache.userId } })
    return
  }
  set({ status: 'out', user: null })
}

// Checks the saved session again (first start, or "Try again").
export function refreshAuth() {
  if (!supabase) {
    set({ status: 'out', user: null })
    return
  }
  supabase.auth
    .getSession()
    .then(({ data, error }) => resolveSession(data?.session ?? null, error))
    .catch((error) => resolveSession(null, error))
}

function start() {
  if (started) return
  started = true
  refreshAuth()
  if (!supabase) return
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      if (state.status !== 'in' || state.user?.id !== session.user.id) set({ status: 'in', user: session.user })
    } else if (event === 'SIGNED_OUT') {
      set({ status: 'out', user: null })
    }
  })
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      if (state.status === 'offline') refreshAuth()
    })
  }
}

export function useAuth() {
  return useSyncExternalStore(subscribe, () => state)
}

export const SETUP_MISSING = "The app isn't connected to its database yet (settings missing)."

// Supabase's error → a sentence Keira can act on.
export function friendlyAuthError(error) {
  if (!error) return null
  const message = String(error.message ?? '').toLowerCase()
  if (error.code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return 'Wrong email or password.'
  }
  if (isNetworkError(error) || browserOffline()) {
    return "Couldn't reach the server. Check your connection and try again."
  }
  return "Couldn't log in. Please try again."
}

export async function signIn(email, password) {
  if (!supabase) return { error: SETUP_MISSING }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) return { error: friendlyAuthError(error) }
    set({ status: 'in', user: data.user })
    return { error: null }
  } catch (error) {
    return { error: friendlyAuthError(error) }
  }
}

// Logs out on this phone and forgets the saved recipes here.
export async function signOut() {
  try {
    await supabase?.auth.signOut({ scope: 'local' })
  } catch {
    // still log out locally below
  }
  clearRecipes()
  set({ status: 'out', user: null })
}
