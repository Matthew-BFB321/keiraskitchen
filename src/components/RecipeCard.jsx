import { Link } from 'react-router-dom'
import { formatTotalTime } from '../lib/libraryFilters.js'
import { findTag } from '../config/tags.js'
import HeartButton from './HeartButton.jsx'
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
      <HeartButton recipe={recipe} />
    </article>
  )
}
