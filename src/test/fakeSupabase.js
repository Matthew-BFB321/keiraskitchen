/*
 * A small stand-in for the Supabase client in tests. Records every query
 * and answers it from a queue (`respondWith`) or with a sensible default:
 * a select returns `rows`, a write returns one row so it counts as saved.
 */
export function createFakeSupabase() {
  const fake = {
    rows: [],
    calls: [],
    queue: [],
    respondWith(response) {
      fake.queue.push(response)
    },
    reset() {
      fake.rows = []
      fake.calls = []
      fake.queue = []
    },
    from(table) {
      const call = { table, ops: [] }
      fake.calls.push(call)
      const builder = {}
      for (const op of ['select', 'insert', 'update', 'delete', 'eq', 'order']) {
        builder[op] = (...args) => {
          call.ops.push([op, ...args])
          return builder
        }
      }
      builder.then = (resolve, reject) => {
        const queued = fake.queue.length ? fake.queue.shift() : null
        const response = queued
          ? typeof queued === 'function'
            ? queued(call)
            : queued
          : call.ops[0][0] === 'select'
            ? { data: fake.rows, error: null }
            : { data: [{ id: 'saved' }], error: null }
        return Promise.resolve(response).then(resolve, reject)
      }
      return builder
    },
  }
  return fake
}

// localStorage for Node, where tests run.
export function installLocalStorage() {
  const items = new Map()
  globalThis.localStorage = {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
    clear: () => items.clear(),
  }
  return items
}

// Lets background writes (and their undo) finish.
export const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
