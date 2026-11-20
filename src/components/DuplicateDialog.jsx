import { getAllRecipes, addRecipe, updateRecipe } from '../lib/recipeStore.js'
import { copyTitle, replaceWith } from '../lib/duplicates.js'
import Dialog from './Dialog.jsx'

/*
 * "You already have …" when saving a new recipe whose title is taken.
 * Used by the Import screen and the Recipe builder. Open while `existing`
 * is set; does the saving itself and calls onSaved(id) afterwards.
 */
export default function DuplicateDialog({ existing, recipe, onSaved, onCancel }) {
  const copy = existing ? copyTitle(getAllRecipes(), recipe.title) : ''
  const lost = existing
    ? [`${existing.ingredients.length} ingredients`, `${existing.steps.length} steps`, existing.notes && 'notes']
        .filter(Boolean)
        .join(', ')
        .replace(/, ([^,]*)$/, ' and $1')
    : ''

  function saveCopy() {
    const saved = { ...recipe, title: copy }
    addRecipe(saved)
    onSaved(saved.id)
  }

  function replace() {
    updateRecipe(replaceWith(existing, recipe))
    onSaved(existing.id)
  }

  return (
    <Dialog
      open={existing != null}
      title={`You already have "${existing?.title ?? ''}".`}
      message={`"Replace it" overwrites the saved recipe's ${lost}${existing?.isFavourite ? '; it stays a favourite' : ''}. "Save as a copy" keeps both, as "${copy}".`}
      secondaryLabel="Save as a copy"
      confirmLabel="Replace it"
      cancelLabel="Cancel"
      destructive
      onSecondary={saveCopy}
      onConfirm={replace}
      onCancel={onCancel}
    />
  )
}
