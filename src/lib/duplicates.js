// Same-title handling when saving a new recipe (Import screen and Recipe builder).

const sameTitle = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase()

// The saved recipe with this title, ignoring case and outer spaces, or null.
export function findByTitle(recipes, title) {
  return recipes.find((r) => sameTitle(r.title, title)) ?? null
}

// "Bobotie" → "Bobotie (2)", or the next free number.
export function copyTitle(recipes, title) {
  const base = title.trim()
  for (let n = 2; ; n++) {
    const candidate = `${base} (${n})`
    if (!findByTitle(recipes, candidate)) return candidate
  }
}

// Replace a saved recipe with a new one: keeps its id, favourite and (if the
// new one has none) its photo. Everything else comes from the new recipe.
export function replaceWith(existing, incoming) {
  return {
    ...incoming,
    id: existing.id,
    isFavourite: existing.isFavourite,
    photoUrl: incoming.photoUrl ?? existing.photoUrl,
  }
}
