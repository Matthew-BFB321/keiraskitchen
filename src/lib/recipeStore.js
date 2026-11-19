import { useSyncExternalStore } from 'react'
import seed from '../data/recipes.json'

/*
 * The ONLY place screens get recipe data from. For now it's the sample JSON
 * held in memory (changes are lost on reload). To move to Supabase, change
 * this file only: fill `recipes`, call notify(), keep the same functions.
 *
 * Updates are immutable (new array, new recipe object) so React re-renders.
 */

let recipes = seed.recipes
const listeners = new Set()

function notify() {
  listeners.forEach((listener) => listener())
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getAllRecipes() {
  return recipes
}

export function getRecipe(id) {
  return recipes.find((r) => r.id === id) ?? null
}

export function toggleFavourite(id) {
  recipes = recipes.map((r) => (r.id === id ? { ...r, isFavourite: !r.isFavourite } : r))
  notify()
}

// React hook: re-renders the component whenever recipes change.
export function useRecipes() {
  return useSyncExternalStore(subscribe, getAllRecipes)
}
