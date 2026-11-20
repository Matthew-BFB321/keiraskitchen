import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRecipes } from '../lib/recipeStore.js'
import { signOut } from '../lib/auth.js'
import Dialog from '../components/Dialog.jsx'
import { findTag } from '../config/tags.js'
import { filterRecipes, sortByTitle, usedTags } from '../lib/libraryFilters.js'
import RecipeCard from '../components/RecipeCard.jsx'
import Sheet from '../components/Sheet.jsx'
import AddRecipeOptions from '../components/AddRecipeOptions.jsx'
import './Library.css'

export default function Library() {
  const recipes = useRecipes()
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const navigate = useNavigate()

  const tags = useMemo(() => usedTags(recipes), [recipes])
  const results = useMemo(() => sortByTitle(filterRecipes(recipes, { query, tag })), [recipes, query, tag])
  const favourites = results.filter((r) => r.isFavourite)
  const others = results.filter((r) => !r.isFavourite)

  function clearSearch() {
    setQuery('')
    setTag(null)
  }

  async function handleLogout() {
    setLogoutOpen(false)
    await signOut()
    navigate('/login', { replace: true })
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
                key={t.id}
                type="button"
                className="library__chip"
                aria-pressed={tag === t.id}
                onClick={() => setTag(tag === t.id ? null : t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {results.length === 0 ? (
            <section className="library__empty">
              <p className="library__empty-text">
                No recipes match
                {query.trim() && <> “{query.trim()}”</>}
                {tag && <> in {findTag(tag)?.label}</>}.
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

      <button type="button" className="library__logout" onClick={() => setLogoutOpen(true)}>
        Log out
      </button>
      <Dialog
        open={logoutOpen}
        title="Log out?"
        message="You'll need your email and password to log back in."
        cancelLabel="Cancel"
        confirmLabel="Log out"
        onCancel={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />
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
