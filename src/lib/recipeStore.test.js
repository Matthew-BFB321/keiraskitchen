import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createFakeSupabase, installLocalStorage, flush } from '../test/fakeSupabase.js'
import samples from '../data/recipes.json'
import { toRow } from './recipeRows.js'

const fake = vi.hoisted(() => ({ client: null }))
vi.mock('./supabase.js', () => ({
  get supabase() {
    return fake.client
  },
}))
vi.mock('./toast.js', () => ({ showToast: vi.fn() }))

const { showToast } = await import('./toast.js')
const store = await import('./recipeStore.js')

const USER = 'user-1'
const CACHE_KEY = 'keiraskitchen.recipes.v1'
const [bobotie, malva, chicken] = samples.recipes

let db
let storage
beforeEach(async () => {
  db = createFakeSupabase()
  fake.client = db
  storage = installLocalStorage()
  showToast.mockClear()
  store.clearRecipes()
})
afterEach(() => vi.unstubAllGlobals())

async function loadWith(recipes) {
  db.rows = recipes.map(toRow)
  await store.loadRecipes(USER)
  db.calls = []
}

describe('loading', () => {
  it('loads the user\'s recipes, marks them ready and saves an offline copy', async () => {
    db.rows = [toRow(bobotie), toRow(malva)]
    const loading = store.loadRecipes(USER)
    expect(store.getStatus()).toBe('loading')
    await loading

    expect(store.getStatus()).toBe('ready')
    expect(store.getAllRecipes()).toEqual([bobotie, malva])
    expect(db.calls[0].ops).toEqual([['select', '*'], ['order', 'created_at', { ascending: true }]])
    const cache = JSON.parse(storage.get(CACHE_KEY))
    expect(cache).toMatchObject({ userId: USER, recipes: [bobotie, malva] })
  })

  it('shows the saved copy straight away, then replaces it with fresh data', async () => {
    storage.set(CACHE_KEY, JSON.stringify({ userId: USER, recipes: [bobotie] }))
    db.rows = [toRow(bobotie), toRow(malva)]
    const loading = store.loadRecipes(USER)
    expect(store.getStatus()).toBe('ready')
    expect(store.getAllRecipes()).toEqual([bobotie])
    await loading
    expect(store.getAllRecipes()).toEqual([bobotie, malva])
  })

  it('ignores a saved copy that belongs to another user', async () => {
    storage.set(CACHE_KEY, JSON.stringify({ userId: 'someone-else', recipes: [bobotie] }))
    db.rows = []
    const loading = store.loadRecipes(USER)
    expect(store.getAllRecipes()).toEqual([])
    expect(store.getStatus()).toBe('loading')
    await loading
  })

  it('falls back to the saved copy, read only, when loading fails', async () => {
    storage.set(CACHE_KEY, JSON.stringify({ userId: USER, recipes: [bobotie] }))
    db.respondWith({ data: null, error: new Error('Failed to fetch') })
    await store.loadRecipes(USER)
    expect(store.getStatus()).toBe('offline')
    expect(store.getAllRecipes()).toEqual([bobotie])
    expect(store.canWrite()).toBe(false)
  })

  it('reports an error when loading fails and nothing is saved', async () => {
    db.respondWith({ data: null, error: new Error('Failed to fetch') })
    await store.loadRecipes(USER)
    expect(store.getStatus()).toBe('error')
    expect(store.getAllRecipes()).toEqual([])
  })

  it('opens from the saved copy without asking Supabase when starting offline', async () => {
    storage.set(CACHE_KEY, JSON.stringify({ userId: USER, recipes: [malva] }))
    await store.loadRecipes(USER, { offline: true })
    expect(store.getStatus()).toBe('offline')
    expect(store.getAllRecipes()).toEqual([malva])
    expect(db.calls).toEqual([])
  })

  it('clearRecipes forgets the recipes and the saved copy', async () => {
    await loadWith([bobotie])
    store.clearRecipes()
    expect(store.getAllRecipes()).toEqual([])
    expect(storage.has(CACHE_KEY)).toBe(false)
  })
})

describe('writing', () => {
  it('adds a recipe straight away and saves it as one row', async () => {
    await loadWith([bobotie])
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    expect(store.addRecipe(malva)).toBe(true)
    expect(store.getRecipe(malva.id)).toBe(malva)
    expect(listener).toHaveBeenCalled()
    await flush()
    expect(db.calls[0].ops).toEqual([['insert', toRow(malva)], ['select', 'id']])
    expect(store.getRecipe(malva.id)).toBe(malva)
    expect(JSON.parse(storage.get(CACHE_KEY)).recipes).toHaveLength(2)
    expect(showToast).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('undoes an add that fails, with a plain message', async () => {
    await loadWith([bobotie])
    db.respondWith({ data: null, error: new Error('Failed to fetch') })
    store.addRecipe(malva)
    expect(store.getRecipe(malva.id)).not.toBeNull()
    await flush()
    expect(store.getRecipe(malva.id)).toBeNull()
    expect(showToast).toHaveBeenCalledWith("Couldn't save. Check your connection and try again.")
    expect(JSON.parse(storage.get(CACHE_KEY)).recipes).toEqual([bobotie])
  })

  it('updates a recipe immutably, and restores it if the save fails', async () => {
    await loadWith([bobotie, malva])
    const before = store.getAllRecipes()
    const renamed = { ...bobotie, title: 'Better Bobotie' }

    db.respondWith({ data: null, error: new Error('Failed to fetch') })
    expect(store.updateRecipe(renamed)).toBe(true)
    expect(store.getAllRecipes()).not.toBe(before)
    expect(store.getRecipe(bobotie.id).title).toBe('Better Bobotie')
    await flush()
    expect(db.calls[0].ops).toEqual([['update', toRow(renamed)], ['eq', 'id', bobotie.id], ['select', 'id']])
    expect(store.getRecipe(bobotie.id)).toEqual(bobotie)
  })

  it('treats a write that changed no rows as failed', async () => {
    await loadWith([bobotie])
    db.respondWith({ data: [], error: null })
    store.updateRecipe({ ...bobotie, title: 'Nope' })
    await flush()
    expect(store.getRecipe(bobotie.id).title).toBe('Bobotie')
    expect(showToast).toHaveBeenCalledWith("Couldn't save. Check your connection and try again.")
  })

  it('deletes a recipe, and puts it back in its place if the delete fails', async () => {
    await loadWith([bobotie, malva, chicken])
    db.respondWith({ data: null, error: new Error('Failed to fetch') })
    expect(store.deleteRecipe(malva.id)).toBe(true)
    expect(store.getAllRecipes().map((r) => r.id)).toEqual([bobotie.id, chicken.id])
    await flush()
    expect(db.calls[0].ops).toEqual([['delete'], ['eq', 'id', malva.id], ['select', 'id']])
    expect(store.getAllRecipes().map((r) => r.id)).toEqual([bobotie.id, malva.id, chicken.id])
  })

  it('toggles a favourite, writing only that column, and flips it back if it fails', async () => {
    await loadWith([bobotie])
    const was = bobotie.isFavourite
    store.toggleFavourite(bobotie.id)
    expect(store.getRecipe(bobotie.id).isFavourite).toBe(!was)
    await flush()
    expect(db.calls[0].ops).toEqual([['update', { is_favourite: !was }], ['eq', 'id', bobotie.id], ['select', 'id']])

    db.respondWith({ data: null, error: new Error('Failed to fetch') })
    store.toggleFavourite(bobotie.id)
    expect(store.getRecipe(bobotie.id).isFavourite).toBe(was)
    await flush()
    expect(store.getRecipe(bobotie.id).isFavourite).toBe(!was)
  })

  it('refuses every write when offline, without calling Supabase', async () => {
    await loadWith([bobotie])
    vi.stubGlobal('navigator', { onLine: false })

    expect(store.canWrite()).toBe(false)
    expect(store.addRecipe(malva)).toBe(false)
    expect(store.updateRecipe({ ...bobotie, title: 'X' })).toBe(false)
    expect(store.deleteRecipe(bobotie.id)).toBe(false)
    expect(store.toggleFavourite(bobotie.id)).toBe(false)

    expect(store.getAllRecipes()).toEqual([bobotie])
    expect(db.calls).toEqual([])
    expect(showToast).toHaveBeenCalledTimes(4)
    expect(showToast).toHaveBeenCalledWith("You're offline, changes can't be saved right now.")
  })

  it('refuses to update or delete a recipe it doesn\'t have', async () => {
    await loadWith([bobotie])
    expect(store.updateRecipe({ ...malva })).toBe(false)
    expect(store.deleteRecipe('missing')).toBe(false)
    expect(db.calls).toEqual([])
  })
})
