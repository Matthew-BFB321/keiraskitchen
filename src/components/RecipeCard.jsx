import { Link } from 'react-router-dom'
import { toggleFavourite } from '../lib/recipeStore.js'
import { formatTotalTime } from '../lib/libraryFilters.js'
import { findTag } from '../config/tags.js'
import './RecipeCard.css'

// Full-width row: thumbnail, title + meta (all one link), heart button outside the link.
export default function RecipeCard({ recipe }) {
  const time = formatTotalTime(recipe.prepMin, recipe.cookMin)
  const firstTag = recipe.tags.map(findTag).find(Boolean)
  const meta = [time, firstTag?.label].filter(Boolean).join(' · ')

  return (
    <article className="recipe-card">
      <Link to={`/recipe/${recipe.id}`} className="recipe-card__link">
        {recipe.photoUrl ? (
          <img className="recipe-card__thumb" src={recipe.photoUrl} alt="" />
        ) : (
          <div className="recipe-card__thumb recipe-card__thumb--empty" aria-hidden="true" />
        )}
        <div className="recipe-card__text">
          <h3 className="recipe-card__title">{recipe.title}</h3>
          {meta && <p className="recipe-card__meta">{meta}</p>}
        </div>
      </Link>
      <button
        type="button"
        className="recipe-card__heart"
        aria-pressed={recipe.isFavourite}
        aria-label={
          recipe.isFavourite ? `Remove ${recipe.title} from favourites` : `Add ${recipe.title} to favourites`
        }
        onClick={() => toggleFavourite(recipe.id)}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path
            d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4 7.4 4c2 0 3.6 1.1 4.6 2.7C13 5.1 14.6 4 16.6 4c3.5 0 5.8 3.6 4.6 7.1-1.7 4.8-9.2 9.4-9.2 9.4z"
            fill={recipe.isFavourite ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </article>
  )
}
