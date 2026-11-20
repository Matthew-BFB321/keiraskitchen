import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { parseRecipeImport } from '../lib/parseRecipeImport.js'
import { getAllRecipes, addRecipe } from '../lib/recipeStore.js'
import { findByTitle } from '../lib/duplicates.js'
import { RecipeIntro, RecipeContent } from '../components/RecipeView.jsx'
import DuplicateDialog from '../components/DuplicateDialog.jsx'
import './Import.css'

export default function Import() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [result, setResult] = useState(null) // parseRecipeImport result, or null before a check
  const [checkedText, setCheckedText] = useState(null)
  const [hint, setHint] = useState(null)
  const [duplicateOf, setDuplicateOf] = useState(null)
  const pasted = useRef(false)
  const textRef = useRef(null)
  const pasteButtonRef = useRef(null)

  function check(value) {
    setCheckedText(value)
    setResult(value.trim() === '' ? null : parseRecipeImport(value))
  }

  function fallbackToBox() {
    setHint('Long-press the box and tap Paste.')
    textRef.current?.focus()
  }

  async function pasteFromClipboard() {
    setHint(null)
    if (!navigator.clipboard?.readText) {
      fallbackToBox()
      return
    }
    try {
      const clip = await navigator.clipboard.readText()
      if (clip.trim() === '') {
        setHint("Nothing to paste. Tap Copy on ChatGPT's code box first.")
        return
      }
      setText(clip)
      check(clip)
    } catch {
      fallbackToBox()
    }
  }

  // A paste is checked straight away; typing is checked on leaving the box.
  function handleChange(event) {
    const value = event.target.value
    setText(value)
    if (pasted.current) {
      pasted.current = false
      check(value)
    }
  }

  function handleBlur() {
    if (text !== checkedText) check(text)
  }

  function startAgain() {
    setText('')
    setResult(null)
    setCheckedText(null)
    setHint(null)
    requestAnimationFrame(() => pasteButtonRef.current?.focus())
  }

  function goToRecipe(id) {
    navigate(`/recipe/${id}`, { replace: true })
  }

  function handleSave() {
    const recipe = result.recipe
    const existing = findByTitle(getAllRecipes(), recipe.title)
    if (existing) {
      setDuplicateOf(existing)
      return
    }
    addRecipe(recipe)
    goToRecipe(recipe.id)
  }

  const passed = result?.ok === true

  return (
    <main className="import">
      <nav className="import__topbar">
        <Link to="/" className="import__icon-button" aria-label="Back to recipes">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="import__title">Import from ChatGPT</h1>
      </nav>

      {!passed && (
        <>
          <p className="import__help">
            In ChatGPT, say "save for Keira's Kitchen", tap Copy on the code box, then come back here.
          </p>

          <button ref={pasteButtonRef} type="button" className="import__button import__button--primary import__button--large" onClick={pasteFromClipboard}>
            Paste from clipboard
          </button>
          {hint && (
            <p className="import__hint" role="status">
              {hint}
            </p>
          )}

          <textarea
            ref={textRef}
            className="import__input"
            rows={6}
            value={text}
            placeholder="…or paste here"
            aria-label="Recipe from ChatGPT"
            spellCheck={false}
            onPaste={() => (pasted.current = true)}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </>
      )}

      {result && !result.ok && (
        <section className="import__problems" role="alert">
          <h2 className="import__problems-title">This didn't work</h2>
          <ul className="import__list">
            {result.errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
          <p className="import__muted">Ask ChatGPT to "save for Keira's Kitchen" again.</p>
          <button type="button" className="import__button" onClick={startAgain}>
            Start again
          </button>
        </section>
      )}

      {passed && (
        <>
          {result.fixes.length > 0 && (
            <details className="import__fixes">
              <summary className="import__fixes-summary">
                Tidied up {result.fixes.length} {result.fixes.length === 1 ? 'thing' : 'things'}
              </summary>
              <ul className="import__list">
                {result.fixes.map((fix, i) => (
                  <li key={i}>{fix}</li>
                ))}
              </ul>
            </details>
          )}

          <div className="recipe import__preview">
            <RecipeIntro recipe={result.recipe} />
            <p className="import__serves">
              Serves {result.recipe.servings}
            </p>
            <RecipeContent recipe={result.recipe} />
          </div>

          <div className="import__actions">
            <button type="button" className="import__button import__button--primary import__button--large" onClick={handleSave}>
              Save recipe
            </button>
            <button
              type="button"
              className="import__button"
              onClick={() => navigate('/builder', { state: { draft: result.recipe } })}
            >
              Edit before saving
            </button>
            <button type="button" className="import__button" onClick={startAgain}>
              Start again
            </button>
          </div>

          <DuplicateDialog
            existing={duplicateOf}
            recipe={result.recipe}
            onSaved={goToRecipe}
            onCancel={() => setDuplicateOf(null)}
          />
        </>
      )}
    </main>
  )
}
