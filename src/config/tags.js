// The single source of recipe tags, in display order. Recipes store the id;
// screens show the label. Changing tags in the app is on the backlog.
export const TAGS = [
  { id: 'pasta', label: 'Pasta' },
  { id: 'asian', label: 'Asian' },
  { id: 'protein', label: 'Protein' },
  { id: 'baking', label: 'Baking' },
  { id: 'quick', label: 'Quick' },
  { id: 'burgers', label: 'Burgers' },
  { id: 'creamy', label: 'Creamy' },
]

export const MAX_TAGS = 3

export function findTag(id) {
  return TAGS.find((t) => t.id === id) ?? null
}
