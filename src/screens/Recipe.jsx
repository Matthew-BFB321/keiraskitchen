import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useRecipe } from '../lib/recipeStore.js'
import { formatTotalTime } from '../lib/libraryFilters.js'
import { formatAmount, groupIngredients, scaleQuantity } from '../lib/quantities.js'
import { findTag } from '../config/tags.js'
import HeartButton from '../components/HeartButton.jsx'
import './Recipe.css'

export default function Recipe() {
  const { id } = useParams()
  // key resets the servings scaler when moving between recipes
  return <RecipeView key={id} id={id} />
}

function RecipeView({ id }) {
  const recipe = useRecipe(id)
  const [servings, setServings] = useState(recipe?.servings ?? 1)

  if (!recipe) {
    return (
      <main className="recipe recipe--missing">
        <h1 className="recipe__title">Recipe not found</h1>
        <p className="recipe__muted">It may have been deleted, or the link is wrong.</p>
        <Link to="/" className="recipe__button">
          Back to recipes
        </Link>
      </main>
    )
  }

  const times = [
    recipe.prepMin != null && `Prep ${formatTotalTime(recipe.prepMin, null)}`,
    recipe.cookMin != null && `Cook ${formatTotalTime(null, recipe.cookMin)}`,
    (recipe.prepMin != null || recipe.cookMin != null) && `Total ${formatTotalTime(recipe.prepMin, recipe.cookMin)}`,
  ].filter(Boolean)
  const tagLabels = recipe.tags.map(findTag).filter(Boolean).map((t) => t.label)
  const steps = [...recipe.steps].sort((a, b) => a.position - b.position)

  return (
    <main className="recipe">
      <nav className="recipe__topbar">
        <Link to="/" className="recipe__icon-button" aria-label="Back to recipes">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <span className="recipe__spacer" />
        <HeartButton recipe={recipe} />
        <Link to={`/builder/${recipe.id}`} className="recipe__text-button">
          Edit
        </Link>
      </nav>

      {recipe.photoUrl ? (
        <img className="recipe__photo" src={recipe.photoUrl} alt="" />
      ) : (
        <div className="recipe__photo recipe__photo--empty" aria-hidden="true" />
      )}

      <header className="recipe__intro">
        <h1 className="recipe__title">{recipe.title}</h1>
        {recipe.description && <p className="recipe__muted">{recipe.description}</p>}
        {times.length > 0 && <p className="recipe__meta">{times.join(' · ')}</p>}
        {tagLabels.length > 0 && (
          <ul className="recipe__tags">
            {tagLabels.map((label) => (
              <li key={label} className="recipe__tag">{label}</li>
            ))}
          </ul>
        )}
      </header>

      <div className="recipe__servings-block">
        <section className="recipe__servings">
          <h2 className="recipe__servings-label">Servings</h2>
          <div className="recipe__stepper">
            <button
              type="button"
              className="recipe__icon-button recipe__icon-button--outlined"
              aria-label="Fewer servings"
              disabled={servings <= 1}
              onClick={() => setServings((s) => Math.max(1, s - 1))}
            >
              −
            </button>
            <output className="recipe__servings-count" aria-live="polite">{servings}</output>
            <button
              type="button"
              className="recipe__icon-button recipe__icon-button--outlined"
              aria-label="More servings"
              onClick={() => setServings((s) => s + 1)}
            >
              +
            </button>
          </div>
        </section>
        {servings !== recipe.servings && (
          <p className="recipe__original">
            Original recipe: {recipe.servings} ·{' '}
            <button type="button" className="recipe__reset" onClick={() => setServings(recipe.servings)}>
              Reset
            </button>
          </p>
        )}
      </div>

      <section className="recipe__section">
        <h2 className="recipe__heading">Ingredients</h2>
        {groupIngredients(recipe.ingredients).map(({ group, items }) => (
          <div key={group ?? '_ungrouped'}>
            {group && <h3 className="recipe__group">{group}</h3>}
            <ul className="recipe__ingredients">
              {items.map((ing) => {
                const amount = formatAmount(scaleQuantity(ing.quantity, recipe.servings, servings), ing.unit)
                return (
                  <li key={ing.id} className="recipe__ingredient">
                    {[amount, ing.item].filter(Boolean).join(' ')}
                    {ing.note && <span className="recipe__muted">, {ing.note}</span>}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </section>

      <section className="recipe__section">
        <h2 className="recipe__heading">Steps</h2>
        <ol className="recipe__steps">
          {steps.map((step) => (
            <li key={step.id} className="recipe__step">
              <span className="recipe__step-number" aria-hidden="true">{step.position}</span>
              <div>
                <p className="recipe__step-text">{step.text}</p>
                {step.timerSeconds != null && (
                  <span className="recipe__badge">{formatTotalTime(null, Math.round(step.timerSeconds / 60))}</span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {recipe.notes && (
        <section className="recipe__section">
          <h2 className="recipe__heading">Notes</h2>
          <p className="recipe__notes">{recipe.notes}</p>
        </section>
      )}

      <div className="recipe__cook-bar">
        <Link to={`/recipe/${recipe.id}/cook?servings=${servings}`} className="recipe__button recipe__button--primary">
          Start cooking
        </Link>
      </div>
    </main>
  )
}
