import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useRecipe, addRecipe, updateRecipe, deleteRecipe } from '../lib/recipeStore.js'
import { emptyForm, recipeToForm, saveForm, newIngredientRow, newSectionRow, newStepRow } from '../lib/recipeForm.js'
import { UNITS } from '../lib/parseRecipeImport.js'
import { TAGS, MAX_TAGS } from '../config/tags.js'
import Dialog from '../components/Dialog.jsx'
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

function moveItem(list, index, delta) {
  const target = index + delta
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

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
  const errorFor = (field, key = null) =>
    errors.filter((e) => e.field === field && e.key === key).map((e) => e.message)
  const dirty = JSON.stringify(form) !== JSON.stringify(initial)
  const exitTo = isEdit ? `/recipe/${id}` : '/'

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))
  const updateRow = (key, patch) =>
    setForm((f) => ({ ...f, rows: f.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) }))
  const updateStep = (key, patch) =>
    setForm((f) => ({ ...f, steps: f.steps.map((s) => (s.key === key ? { ...s, ...patch } : s)) }))

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
    if (isEdit) updateRecipe(result.recipe)
    else addRecipe(result.recipe)
    navigate(`/recipe/${result.recipe.id}`, { replace: true })
  }

  function handleCancel() {
    if (dirty) setConfirm('discard')
    else navigate(exitTo)
  }

  function handleDelete() {
    navigate('/', { replace: true })
    deleteRecipe(id)
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
          <h2 className="builder__heading">Ingredients</h2>
          {errorFor('ingredients').map((m) => (
            <p key={m} className="builder__error">{m}</p>
          ))}
          <ul className="builder__list">
            {form.rows.map((row, index) => (
              <li key={row.key} className={'builder__card' + (row.kind === 'section' ? ' builder__card--section' : '')}>
                {row.kind === 'section' ? (
                  <Field label="Section name" errors={errorFor('name', row.key)}>
                    <input
                      className="builder__input"
                      value={row.name}
                      onChange={(e) => updateRow(row.key, { name: e.target.value })}
                      placeholder="e.g. Sauce"
                    />
                  </Field>
                ) : (
                  <>
                    <div className="builder__ingredient-line">
                      <Field label="Amount" errors={errorFor('quantity', row.key)} className="builder__qty">
                        <input
                          className="builder__input"
                          value={row.quantity}
                          onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                          placeholder="1/2"
                        />
                      </Field>
                      <Field label="Unit" errors={errorFor('unit', row.key)} className="builder__unit">
                        <select
                          className="builder__input"
                          value={row.unit}
                          onChange={(e) => updateRow(row.key, { unit: e.target.value })}
                        >
                          <option value="">none</option>
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <Field label="Ingredient" errors={errorFor('item', row.key)}>
                      <input
                        className="builder__input"
                        value={row.item}
                        onChange={(e) => updateRow(row.key, { item: e.target.value })}
                        placeholder="e.g. onion"
                      />
                    </Field>
                    <Field label="Note" errors={errorFor('note', row.key)}>
                      <input
                        className="builder__input"
                        value={row.note}
                        onChange={(e) => updateRow(row.key, { note: e.target.value })}
                        placeholder="e.g. finely chopped"
                      />
                    </Field>
                  </>
                )}
                <RowControls
                  label={row.kind === 'section' ? 'section' : 'ingredient'}
                  isFirst={index === 0}
                  isLast={index === form.rows.length - 1}
                  onUp={() => setForm((f) => ({ ...f, rows: moveItem(f.rows, index, -1) }))}
                  onDown={() => setForm((f) => ({ ...f, rows: moveItem(f.rows, index, 1) }))}
                  onRemove={() => setForm((f) => ({ ...f, rows: f.rows.filter((r) => r.key !== row.key) }))}
                />
              </li>
            ))}
          </ul>
          <div className="builder__add-row">
            <button
              type="button"
              className="builder__button"
              onClick={() => setForm((f) => ({ ...f, rows: [...f.rows, newIngredientRow()] }))}
            >
              + Add ingredient
            </button>
            <button
              type="button"
              className="builder__button"
              onClick={() => setForm((f) => ({ ...f, rows: [...f.rows, newSectionRow()] }))}
            >
              Add section
            </button>
          </div>
        </section>

        <section className="builder__section">
          <h2 className="builder__heading">Steps</h2>
          {errorFor('steps').map((m) => (
            <p key={m} className="builder__error">{m}</p>
          ))}
          <ol className="builder__list">
            {form.steps.map((s, index) => (
              <li key={s.key} className="builder__card">
                <Field label={`Step ${index + 1}`} errors={errorFor('text', s.key)}>
                  <textarea
                    className="builder__input builder__textarea"
                    rows={3}
                    value={s.text}
                    onChange={(e) => updateStep(s.key, { text: e.target.value })}
                  />
                </Field>
                <Field label="Timer (minutes)" errors={errorFor('timerMin', s.key)} className="builder__timer">
                  <input
                    className="builder__input"
                    inputMode="decimal"
                    value={s.timerMin}
                    onChange={(e) => updateStep(s.key, { timerMin: e.target.value })}
                  />
                </Field>
                <RowControls
                  label="step"
                  isFirst={index === 0}
                  isLast={index === form.steps.length - 1}
                  onUp={() => setForm((f) => ({ ...f, steps: moveItem(f.steps, index, -1) }))}
                  onDown={() => setForm((f) => ({ ...f, steps: moveItem(f.steps, index, 1) }))}
                  onRemove={() => setForm((f) => ({ ...f, steps: f.steps.filter((x) => x.key !== s.key) }))}
                />
              </li>
            ))}
          </ol>
          <div className="builder__add-row">
            <button
              type="button"
              className="builder__button"
              onClick={() => setForm((f) => ({ ...f, steps: [...f.steps, newStepRow()] }))}
            >
              + Add step
            </button>
          </div>
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
    </main>
  )
}

function Field({ label, errors = [], className = '', children }) {
  return (
    <label className={`builder__field ${errors.length ? 'builder__field--error' : ''} ${className}`}>
      <span className="builder__label">{label}</span>
      {children}
      {errors.map((m) => (
        <span key={m} className="builder__error">
          {m}
        </span>
      ))}
    </label>
  )
}

function RowControls({ label, isFirst, isLast, onUp, onDown, onRemove }) {
  return (
    <div className="builder__controls">
      <button type="button" className="builder__icon-button" aria-label={`Move ${label} up`} disabled={isFirst} onClick={onUp}>
        ↑
      </button>
      <button type="button" className="builder__icon-button" aria-label={`Move ${label} down`} disabled={isLast} onClick={onDown}>
        ↓
      </button>
      <button type="button" className="builder__icon-button" aria-label={`Remove ${label}`} onClick={onRemove}>
        ✕
      </button>
    </div>
  )
}
