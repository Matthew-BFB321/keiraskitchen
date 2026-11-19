import { Link } from 'react-router-dom'
import './AddRecipeOptions.css'

// The two ways to add a recipe. Used in the Library's Add sheet and empty state.
export default function AddRecipeOptions() {
  return (
    <div className="add-options">
      <Link to="/import" className="add-options__option">
        <span className="add-options__label">Import from ChatGPT</span>
        <span className="add-options__hint">Paste a recipe ChatGPT has formatted</span>
      </Link>
      <Link to="/builder" className="add-options__option">
        <span className="add-options__label">Write it myself</span>
        <span className="add-options__hint">Type it in step by step</span>
      </Link>
    </div>
  )
}
