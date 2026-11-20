import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useRecipe } from '../lib/recipeStore.js'
import { useCookProgress } from '../lib/cookProgress.js'
import HeartButton from '../components/HeartButton.jsx'
import { RecipeIntro, RecipeContent } from '../components/RecipeView.jsx'
import './Recipe.css'

export default function Recipe() {
  const { id } = useParams()
  // key resets the servings scaler when moving between recipes
  return <RecipeScreen key={id} id={id} />
}

function RecipeScreen({ id }) {
  const recipe = useRecipe(id)
  const [servings, setServings] = useState(recipe?.servings ?? 1)
  const cooking = useCookProgress(id)

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

      {cooking.timers.length > 0 && (
        <Link to={`/recipe/${recipe.id}/cook?servings=${cooking.servings ?? servings}`} className="recipe__cooking-pill">
          {cooking.timers.length} {cooking.timers.length === 1 ? 'timer' : 'timers'} running · Back to cooking
        </Link>
      )}

      <RecipeIntro recipe={recipe} />

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

      <RecipeContent recipe={recipe} servings={servings} />

      <div className="recipe__cook-bar">
        <Link to={`/recipe/${recipe.id}/cook?servings=${servings}`} className="recipe__button recipe__button--primary">
          Start cooking
        </Link>
      </div>
    </main>
  )
}
