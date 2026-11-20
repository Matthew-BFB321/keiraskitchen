// Internal recipe <-> row in the Supabase `recipes` table (one row per recipe).
// Title and favourite get their own columns; everything else lives in `data`.

export const SCHEMA_VERSION = 1

export function toRow(recipe) {
  const { id, title, isFavourite, ...data } = recipe
  return { id, schema_version: SCHEMA_VERSION, title, is_favourite: Boolean(isFavourite), data }
}

export function fromRow(row) {
  return { ...row.data, id: row.id, title: row.title, isFavourite: row.is_favourite }
}
