import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useRecipe, getAllRecipes, addRecipe, updateRecipe, deleteRecipe } from '../lib/recipeStore.js'
import { findByTitle } from '../lib/duplicates.js'
import { emptyForm, recipeToForm, saveForm, previewForm } from '../lib/recipeForm.js'
import { formatAmount } from '../lib/quantities.js'
import { formatTotalTime } from '../lib/libraryFilters.js'
import { TAGS, MAX_TAGS } from '../config/tags.js'
import Dialog from '../components/Dialog.jsx'
import DuplicateDialog from '../components/DuplicateDialog.jsx'
import './RecipeBuilder.css'

/*
 * /builder         new recipe
 * /builder + draft new recipe pre-filled: navigate('/builder', { state: { draft } })
 *                  where draft is an internal-schema recipe (e.g. from the importer)
 * /builder/:id     edit a saved recipe
 */
export default function RecipeBuilder() {
  const { id } = useParams()
  // key starts a fresh form when moving between recipes
  return <Builder key={id ?? 'new'} id={id} />
}

const INGREDIENTS_EXAMPLE = '500 g beef mince\n2 onions, finely chopped\n1 1/2 tsp salt\nSauce:\n250 ml cream'
const STEPS_EXAMPLE = 'Fry the onions until soft, about 8 minutes.\nAdd the mince and brown it.\nSimmer for 1 hour 30 min.'

function Builder({ id }) {
  const navigate = useNavigate()
  const location = useLocation()
  const existing = useRecipe(id)
  const isEdit = id !== undefined

  const [initial] = useState(() => {
    if (isEdit) return existing ? recipeToForm(existing) : null
    const draft = location.state?.draft
    return draft ? recipeToForm(draft) : emptyForm()
  })
  const [form, setForm] = useState(initial)
  const [submitted, setSubmitted] = useState(false)
  const [confirm, setConfirm] = useState(null) // 'discard' | 'delete' | null
  const [duplicate, setDuplicate] = useState(null) // { existing, recipe } when a new recipe's title is taken

  if (!form) {
    return (
      <main className="builder builder--missing">
        <h1 className="builder__missing-title">Recipe not found</h1>
        <p className="builder__muted">It may have been deleted, or the link is wrong.</p>
        <Link to="/" className="builder__button">
          Back to recipes
        </Link>
      </main>
    )
  }

  // After the first Save attempt, problems update live as she fixes them.
  const errors = submitted ? (saveForm(form, existing).errors ?? []) : []
  // Whole-box and top-level problems; problems on a line show in the preview.
  const errorFor = (field) => errors.filter((e) => e.field === field && e.line === null).map((e) => e.message)
  const preview = previewForm(form)
  const dirty = JSON.stringify(form) !== JSON.stringify(initial)
  const exitTo = isEdit ? `/recipe/${id}` : '/'

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  function toggleTag(tagId) {
    setForm((f) => {
      if (f.tags.includes(tagId)) return { ...f, tags: f.tags.filter((t) => t !== tagId) }
      if (f.tags.length >= MAX_TAGS) return f
      return { ...f, tags: [...f.tags, tagId] }
    })
  }

  function handleSave() {
    const result = saveForm(form, existing)
    if (!result.ok) {
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    // Store calls return false when offline (a toast explains); stay on the form then.
    if (isEdit) {
      // Editing never checks titles: it would always match itself.
      if (!updateRecipe(result.recipe)) return
    } else {
      const sameTitle = findByTitle(getAllRecipes(), result.recipe.title)
      if (sameTitle) {
        setDuplicate({ existing: sameTitle, recipe: result.recipe })
        return
      }
      if (!addRecipe(result.recipe)) return
    }
    goToRecipe(result.recipe.id)
  }

  function goToRecipe(recipeId) {
    navigate(`/recipe/${recipeId}`, { replace: true })
  }

  function handleCancel() {
    if (dirty) setConfirm('discard')
    else navigate(exitTo)
  }

  function handleDelete() {
    if (deleteRecipe(id)) navigate('/', { replace: true })
    else setConfirm(null)
  }

  const deleteMessage = existing
    ? `The recipe, its ${existing.ingredients.length} ingredients, ${existing.steps.length} steps${existing.notes ? ' and notes' : ''} will be deleted. This can't be undone.`
    : ''

  return (
    <main className="builder">
      <header className="builder__topbar">
        <button type="button" className="builder__bar-button" onClick={handleCancel}>
          Cancel
        </button>
        <h1 className="builder__title">{isEdit ? 'Edit recipe' : 'New recipe'}</h1>
        <button type="button" className="builder__bar-button builder__bar-button--primary" onClick={handleSave}>
          Save
        </button>
      </header>

      <div className="builder__body">
        {errors.length > 0 && (
          <section className="builder__summary" role="alert">
            <p className="builder__summary-title">
              Please fix {errors.length === 1 ? 'this' : `these ${errors.length} things`}:
            </p>
            <ul className="builder__summary-list">
              {errors.map((e, i) => (
                <li key={i}>{e.message}</li>
              ))}
            </ul>
          </section>
        )}

        <Field label="Title" errors={errorFor('title')}>
          <input
            className="builder__input"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Bobotie"
          />
        </Field>

        <Field label="Description" errors={errorFor('description')}>
          <textarea
            className="builder__input builder__textarea"
            rows={2}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="One sentence about the dish"
          />
        </Field>

        <div className="builder__servings">
          <span className="builder__label">Servings</span>
          <div className="builder__stepper">
            <button
              type="button"
              className="builder__round-button"
              aria-label="Fewer servings"
              disabled={form.servings <= 1}
              onClick={() => set('servings', Math.max(1, form.servings - 1))}
            >
              −
            </button>
            <output className="builder__servings-count" aria-live="polite">{form.servings}</output>
            <button
              type="button"
              className="builder__round-button"
              aria-label="More servings"
              onClick={() => set('servings', form.servings + 1)}
            >
              +
            </button>
          </div>
        </div>
        {errorFor('servings').map((m) => (
          <p key={m} className="builder__error">{m}</p>
        ))}

        <div className="builder__row">
          <Field label="Prep (min)" errors={errorFor('prepMin')}>
            <input
              className="builder__input"
              inputMode="numeric"
              pattern="[0-9]*"
              value={form.prepMin}
              onChange={(e) => set('prepMin', e.target.value)}
            />
          </Field>
          <Field label="Cook (min)" errors={errorFor('cookMin')}>
            <input
              className="builder__input"
              inputMode="numeric"
              pattern="[0-9]*"
              value={form.cookMin}
              onChange={(e) => set('cookMin', e.target.value)}
            />
          </Field>
        </div>

        <section className="builder__section">
          <h2 className="builder__heading">Tags</h2>
          <div className="builder__chips" role="group" aria-label="Tags">
            {TAGS.map((tag) => {
              const selected = form.tags.includes(tag.id)
              const full = !selected && form.tags.length >= MAX_TAGS
              return (
                <button
                  key={tag.id}
                  type="button"
                  className="builder__chip"
                  aria-pressed={selected}
                  aria-disabled={full}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.label}
                </button>
              )
            })}
          </div>
          <p className="builder__muted builder__hint">Up to {MAX_TAGS} tags</p>
        </section>

        <section className="builder__section">
          <Field
            label="Ingredients"
            hint="One ingredient per line. End a line with : for a section, e.g. Sauce:"
            errors={errorFor('ingredients')}
          >
            <textarea
              className="builder__input builder__textarea builder__lines"
              rows={8}
              value={form.ingredientsText}
              onChange={(e) => set('ingredientsText', e.target.value)}
              placeholder={INGREDIENTS_EXAMPLE}
            />
          </Field>
          {preview.ingredients.length > 0 && (
            <div className="builder__preview" aria-label="Ingredients as read">
              <p className="builder__preview-title">Read as</p>
              <ul className="builder__preview-list">
                {preview.ingredients.map((entry) =>
                  entry.heading !== undefined ? (
                    <li key={entry.line} className="builder__preview-heading">
                      {entry.heading}
                    </li>
                  ) : (
                    <li key={entry.line} className="builder__preview-item">
                      {[
                        entry.quantity != null ? formatAmount(entry.quantity, entry.unit) : entry.unit,
                        entry.item || '?',
                        entry.note,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      {submitted && entry.error && <span className="builder__error">{entry.error}</span>}
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}
        </section>

        <section className="builder__section">
          <Field
            label="Steps"
            hint={'One step per line. Times like "10 minutes" become timers.'}
            errors={errorFor('steps')}
          >
            <textarea
              className="builder__input builder__textarea builder__lines"
              rows={8}
              value={form.stepsText}
              onChange={(e) => set('stepsText', e.target.value)}
              placeholder={STEPS_EXAMPLE}
            />
          </Field>
          {preview.steps.length > 0 && (
            <div className="builder__preview" aria-label="Steps as read">
              <p className="builder__preview-title">Read as</p>
              <ol className="builder__preview-list">
                {preview.steps.map((step, index) => (
                  <li key={step.line} className="builder__preview-step">
                    <span className="builder__preview-number">{index + 1}</span>
                    <span className="builder__preview-text">
                      {step.text || '?'}
                      {step.timerSeconds != null && (
                        <span className="builder__badge">{formatTotalTime(null, Math.round(step.timerSeconds / 60))}</span>
                      )}
                      {submitted && step.error && <span className="builder__error">{step.error}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>

        <Field label="Notes" errors={errorFor('notes')}>
          <textarea
            className="builder__input builder__textarea"
            rows={3}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </Field>

        <Field label="Source" errors={errorFor('source')}>
          <input
            className="builder__input"
            value={form.source}
            onChange={(e) => set('source', e.target.value)}
            placeholder="Instagram @handle"
          />
        </Field>

        {isEdit && (
          <button type="button" className="builder__delete" onClick={() => setConfirm('delete')}>
            Delete recipe
          </button>
        )}
      </div>

      <Dialog
        open={confirm === 'discard'}
        title="Discard changes?"
        message="Your changes to this recipe will be lost."
        cancelLabel="Keep editing"
        confirmLabel="Discard"
        destructive
        onCancel={() => setConfirm(null)}
        onConfirm={() => navigate(exitTo)}
      />
      <Dialog
        open={confirm === 'delete'}
        title={`Delete "${existing?.title ?? ''}"?`}
        message={deleteMessage}
        cancelLabel="Keep recipe"
        confirmLabel="Delete recipe"
        destructive
        onCancel={() => setConfirm(null)}
        onConfirm={handleDelete}
      />
      <DuplicateDialog
        existing={duplicate?.existing ?? null}
        recipe={duplicate?.recipe}
        onSaved={goToRecipe}
        onCancel={() => setDuplicate(null)}
      />
    </main>
  )
}

function Field({ label, hint, errors = [], className = '', children }) {
  return (
    <label className={`builder__field ${errors.length ? 'builder__field--error' : ''} ${className}`}>
      <span className="builder__label">{label}</span>
      {hint && <span className="builder__muted builder__hint">{hint}</span>}
      {children}
      {errors.map((m) => (
        <span key={m} className="builder__error">
          {m}
        </span>
      ))}
    </label>
  )
}
