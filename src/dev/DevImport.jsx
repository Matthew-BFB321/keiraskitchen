import { useState } from 'react'
import { parseRecipeImport } from '../lib/parseRecipeImport.js'
import './DevImport.css'

// Temporary developer page for testing ChatGPT output against the import
// format. Reachable only by typing /dev/import; not linked anywhere.
export default function DevImport() {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)

  return (
    <main className="dev-import">
      <h1 className="dev-import__title">Import check (dev)</h1>
      <textarea
        className="dev-import__input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste ChatGPT's recipe here"
        spellCheck={false}
      />
      <button type="button" className="dev-import__button" onClick={() => setResult(parseRecipeImport(text))}>
        Check
      </button>

      {result?.ok && (
        <section>
          <h2 className="dev-import__heading">OK: recipe would be saved</h2>
          <h3 className="dev-import__heading">Fixes made ({result.fixes.length})</h3>
          {result.fixes.length > 0 ? (
            <ul className="dev-import__list">
              {result.fixes.map((fix, i) => <li key={i}>{fix}</li>)}
            </ul>
          ) : (
            <p className="dev-import__muted">None</p>
          )}
          <h3 className="dev-import__heading">Converted recipe</h3>
          <pre className="dev-import__output">{JSON.stringify(result.recipe, null, 2)}</pre>
        </section>
      )}

      {result && !result.ok && (
        <section>
          <h2 className="dev-import__heading">Errors ({result.errors.length})</h2>
          <ul className="dev-import__list">
            {result.errors.map((error, i) => <li key={i}>{error}</li>)}
          </ul>
        </section>
      )}
    </main>
  )
}
