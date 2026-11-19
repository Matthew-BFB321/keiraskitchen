import { useMemo, useState } from 'react'
import { useRecipes } from '../lib/recipeStore.js'
import { allTags, filterRecipes, sortByTitle } from '../lib/libraryFilters.js'
import RecipeCard from '../components/RecipeCard.jsx'
import Sheet from '../components/Sheet.jsx'
import AddRecipeOptions from '../components/AddRecipeOptions.jsx'
import './Library.css'

export default function Library() {
  const recipes = useRecipes()
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState(null)
  const [addOpen, setAddOpen] = useState(false)

  const tags = useMemo(() => allTags(recipes), [recipes])
  const results = useMemo(() => sortByTitle(filterRecipes(recipes, { query, tag })), [recipes, query, tag])
  const favourites = results.filter((r) => r.isFavourite)
  const others = results.filter((r) => !r.isFavourite)

  function clearSearch() {
    setQuery('')
    setTag(null)
  }

  return (
    <main className="library">
      <header className="library__header">
        <h1 className="library__title">Keira's Kitchen</h1>
        <button type="button" className="library__add" aria-label="Add recipe" onClick={() => setAddOpen(true)}>
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {recipes.length === 0 ? (
        <section className="library__empty">
          <p className="library__empty-text">No recipes yet. Add your first one.</p>
          <AddRecipeOptions />
        </section>
      ) : (
        <>
          <input
            type="search"
            className="library__search"
            placeholder="Search recipes or ingredients"
            aria-label="Search recipes or ingredients"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="library__chips" role="group" aria-label="Filter by tag">
            <button
              type="button"
              className="library__chip"
              aria-pressed={tag === null}
              onClick={() => setTag(null)}
            >
              All
            </button>
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                className="library__chip"
                aria-pressed={tag === t}
                onClick={() => setTag(tag === t ? null : t)}
              >
                {t}
              </button>
            ))}
          </div>

          {results.length === 0 ? (
            <section className="library__empty">
              <p className="library__empty-text">
                No recipes match
                {query.trim() && <> “{query.trim()}”</>}
                {tag && <> in {tag}</>}.
              </p>
              <button type="button" className="library__clear" onClick={clearSearch}>
                Clear search
              </button>
            </section>
          ) : (
            <>
              {favourites.length > 0 && <RecipeSection title="Favourites" recipes={favourites} />}
              {others.length > 0 && <RecipeSection title="All recipes" recipes={others} />}
            </>
          )}
        </>
      )}

      <Sheet open={addOpen} title="Add a recipe" onClose={() => setAddOpen(false)}>
        <AddRecipeOptions />
      </Sheet>
    </main>
  )
}

function RecipeSection({ title, recipes }) {
  return (
    <section className="library__section">
      <h2 className="library__section-title">{title}</h2>
      <ul className="library__list">
        {recipes.map((r) => (
          <li key={r.id}>
            <RecipeCard recipe={r} />
          </li>
        ))}
      </ul>
    </section>
  )
}
