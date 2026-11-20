import { useSyncExternalStore } from 'react'
import { supabase } from './supabase.js'
import { toRow, fromRow } from './recipeRows.js'
import { showToast } from './toast.js'

/*
 * The ONLY place screens get recipe data from. Backed by Supabase (one row
 * per recipe, see recipeRows.js), with an in-memory copy for the screens and
 * a localStorage copy so the app still opens offline (read only).
 *
 * Writes update the screen straight away; if Supabase then fails, that one
 * change is undone and a toast explains. Offline, writes are refused.
 * Write functions return true if the change was accepted, false if not.
 */

export const SAVE_FAILED = "Couldn't save. Check your connection and try again."
export const OFFLINE = "You're offline, changes can't be saved right now."
const CACHE_KEY = 'keiraskitchen.recipes.v1'

let recipes = []
let status = 'loading' // 'loading' | 'ready' | 'offline' | 'error'
let userId = null
let loadNumber = 0 // ignores results from an older load
const listeners = new Set()

function notify() {
  listeners.forEach((listener) => listener())
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// --- Offline copy ---------------------------------------------------------

export function readCache() {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY))
    return cache && Array.isArray(cache.recipes) ? cache : null
  } catch {
    return null
  }
}

function writeCache() {
  if (!userId) return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ userId, savedAt: new Date().toISOString(), recipes }))
  } catch {
    // storage full or blocked: the app still works online
  }
}

function removeCache() {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    // nothing to remove
  }
}

// --- Loading --------------------------------------------------------------

/*
 * Loads a user's recipes. A saved copy for the same user shows straight
 * away, then fresh data replaces it. If loading fails: the saved copy is
 * shown read only ('offline'), or 'error' when there's none.
 */
export async function loadRecipes(id, { offline = false } = {}) {
  const thisLoad = ++loadNumber
  userId = id
  const cache = readCache()
  const cached = cache && cache.userId === id ? cache.recipes : null
  recipes = cached ?? []
  status = cached ? (offline ? 'offline' : 'ready') : offline ? 'error' : 'loading'
  notify()
  if (offline) return

  try {
    const { data, error } = await supabase.from('recipes').select('*').order('created_at', { ascending: true })
    if (error) throw error
    if (thisLoad !== loadNumber) return
    recipes = data.map(fromRow)
    status = 'ready'
    writeCache()
  } catch {
    if (thisLoad !== loadNumber) return
    status = cached ? 'offline' : 'error'
  }
  notify()
}

// Logging out: forget everything, including the offline copy.
export function clearRecipes() {
  loadNumber++
  recipes = []
  userId = null
  status = 'loading'
  removeCache()
  notify()
}

if (typeof window !== 'undefined') {
  // Back online after showing the offline copy: fetch fresh data.
  window.addEventListener('online', () => {
    if (userId && status === 'offline') loadRecipes(userId)
  })
}

// --- Reading --------------------------------------------------------------

export function getAllRecipes() {
  return recipes
}

export function getRecipe(id) {
  return recipes.find((r) => r.id === id) ?? null
}

export function getStatus() {
  return status
}

export function canWrite() {
  const browserOffline = typeof navigator !== 'undefined' && navigator.onLine === false
  return !browserOffline && status !== 'offline'
}

// --- Writing --------------------------------------------------------------

/*
 * apply: change the in-memory list now. undo: put that one recipe back.
 * request: the Supabase call; it must return at least one row, so a write
 * that matched nothing (e.g. blocked by RLS) also counts as a failure.
 */
function write(apply, undo, request) {
  if (!canWrite()) {
    showToast(OFFLINE)
    return false
  }
  apply()
  writeCache()
  notify()
  Promise.resolve()
    .then(request)
    .then(({ data, error }) => {
      if (error) throw error
      if (!data || data.length === 0) throw new Error('Nothing was saved')
    })
    .catch(() => {
      undo()
      writeCache()
      notify()
      showToast(SAVE_FAILED)
    })
  return true
}

const replaceById = (id, recipe) => {
  recipes = recipes.map((r) => (r.id === id ? recipe : r))
}

export function addRecipe(recipe) {
  return write(
    () => (recipes = [...recipes, recipe]),
    () => (recipes = recipes.filter((r) => r.id !== recipe.id)),
    () => supabase.from('recipes').insert(toRow(recipe)).select('id'),
  )
}

// Replaces the recipe with the same id.
export function updateRecipe(recipe) {
  const previous = getRecipe(recipe.id)
  if (!previous) return false
  return write(
    () => replaceById(recipe.id, recipe),
    () => replaceById(recipe.id, previous),
    () => supabase.from('recipes').update(toRow(recipe)).eq('id', recipe.id).select('id'),
  )
}

export function deleteRecipe(id) {
  const index = recipes.findIndex((r) => r.id === id)
  if (index === -1) return false
  const previous = recipes[index]
  return write(
    () => (recipes = recipes.filter((r) => r.id !== id)),
    () => (recipes = [...recipes.slice(0, index), previous, ...recipes.slice(index)]),
    () => supabase.from('recipes').delete().eq('id', id).select('id'),
  )
}

export function toggleFavourite(id) {
  const previous = getRecipe(id)
  if (!previous) return false
  const isFavourite = !previous.isFavourite
  return write(
    () => replaceById(id, { ...previous, isFavourite }),
    () => (recipes = recipes.map((r) => (r.id === id ? { ...r, isFavourite: previous.isFavourite } : r))),
    () => supabase.from('recipes').update({ is_favourite: isFavourite }).eq('id', id).select('id'),
  )
}

// --- React hooks ----------------------------------------------------------

// Re-renders the component whenever recipes change.
export function useRecipes() {
  return useSyncExternalStore(subscribe, getAllRecipes)
}

// One recipe (null if not found); re-renders when it changes.
export function useRecipe(id) {
  return useSyncExternalStore(subscribe, () => getRecipe(id))
}

export function useStoreStatus() {
  return useSyncExternalStore(subscribe, getStatus)
}
