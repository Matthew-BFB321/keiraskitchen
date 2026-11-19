import { toggleFavourite } from '../lib/recipeStore.js'
import './HeartButton.css'

// The one favourite toggle, used by recipe cards and the Recipe screen.
export default function HeartButton({ recipe }) {
  return (
    <button
      type="button"
      className="heart-button"
      aria-pressed={recipe.isFavourite}
      aria-label={recipe.isFavourite ? `Remove ${recipe.title} from favourites` : `Add ${recipe.title} to favourites`}
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
  )
}
