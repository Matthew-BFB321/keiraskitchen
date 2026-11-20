import { formatTotalTime } from '../lib/libraryFilters.js'
import { formatAmount, groupIngredients, scaleQuantity } from '../lib/quantities.js'
import { findTag } from '../config/tags.js'
import '../screens/Recipe.css'

/*
 * Read-only recipe display, shared by the Recipe screen and the Import
 * preview. Both pieces return fragments so they sit directly in the
 * screen's flex column (.recipe) with its spacing.
 */

// Photo, title, description, times and tags.
export function RecipeIntro({ recipe }) {
  const times = [
    recipe.prepMin != null && `Prep ${formatTotalTime(recipe.prepMin, null)}`,
    recipe.cookMin != null && `Cook ${formatTotalTime(null, recipe.cookMin)}`,
    (recipe.prepMin != null || recipe.cookMin != null) && `Total ${formatTotalTime(recipe.prepMin, recipe.cookMin)}`,
  ].filter(Boolean)
  const tagLabels = recipe.tags.map(findTag).filter(Boolean).map((t) => t.label)

  return (
    <>
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
    </>
  )
}

// Ingredients (grouped, scaled to `servings`), steps with timer badges, and notes.
export function RecipeContent({ recipe, servings = recipe.servings }) {
  const steps = [...recipe.steps].sort((a, b) => a.position - b.position)

  return (
    <>
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
    </>
  )
}
