import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useRecipe, getRecipe } from '../lib/recipeStore.js'
import {
  useCookProgress,
  getProgress,
  sessionStart,
  clearProgress,
  clearIfFinished,
  markActive,
  setServings,
  toggleDone,
  setCurrent,
  toggleGot,
  markDoneAndAdvance,
  startTimer,
  pauseTimer,
  resumeTimer,
  cancelTimer,
} from '../lib/cookProgress.js'
import { remainingMs, isFinished, formatCountdown } from '../lib/cookTimers.js'
import { formatAmount, groupIngredients, scaleQuantity } from '../lib/quantities.js'
import { formatTotalTime } from '../lib/libraryFilters.js'
import { unlockAudio } from '../lib/alarm.js'
import { useNow } from '../lib/useNow.js'
import { useWakeLock } from '../lib/useWakeLock.js'
import Sheet from '../components/Sheet.jsx'
import Dialog from '../components/Dialog.jsx'
import './CookMode.css'

function parseServings(value) {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 ? n : null
}

export default function CookMode() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const recipe = useRecipe(id)
  const progress = useCookProgress(id)
  const now = useNow(progress.timers.some((t) => t.endsAt != null))
  const [ingredientsOpen, setIngredientsOpen] = useState(false)
  const stepRefs = useRef(new Map())
  useWakeLock()

  // Decided once, on opening, before anything below records new activity.
  const [start] = useState(() => (recipe ? sessionStart(getProgress(id), recipe.steps, Date.now()) : 'fresh'))
  const [askResume, setAskResume] = useState(start === 'ask')

  useEffect(() => {
    if (start === 'reset') clearProgress(id)
    else markActive(id)
    // Leaving after ticking every step: the next "Start cooking" starts fresh.
    return () => {
      const r = getRecipe(id)
      if (r) clearIfFinished(id, r.steps)
    }
  }, [id, start])

  const servings = parseServings(searchParams.get('servings')) ?? progress.servings ?? recipe?.servings ?? 1

  // Remember the servings so the Recipe screen's "Back to cooking" pill can return here.
  useEffect(() => {
    if (recipe && progress.servings !== servings) setServings(id, servings)
  }, [id, recipe, servings, progress.servings])

  if (!recipe) {
    return (
      <main className="cook cook--missing">
        <h1 className="cook__missing-title">Recipe not found</h1>
        <p className="cook__muted">It may have been deleted, or the link is wrong.</p>
        <Link to="/" className="cook__button">
          Back to recipes
        </Link>
      </main>
    )
  }

  const steps = [...recipe.steps].sort((a, b) => a.position - b.position)
  const currentId = progress.currentStepId ?? steps[0]?.id
  const doneCount = steps.filter((s) => progress.doneStepIds.includes(s.id)).length
  const allDone = steps.length > 0 && doneCount === steps.length

  function scrollToStep(stepId) {
    requestAnimationFrame(() => {
      stepRefs.current.get(stepId)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }

  function handleDoneNext() {
    scrollToStep(markDoneAndAdvance(id, steps))
  }

  function handleStartTimer(step) {
    unlockAudio() // must happen inside this tap for iPhones to allow the alarm later
    startTimer(id, step.id, step.timerSeconds)
  }

  function handleTimerTap(stepId) {
    setCurrent(id, stepId)
    scrollToStep(stepId)
  }

  return (
    <main className="cook">
      <div className="cook__header">
        <nav className="cook__topbar">
          <Link to={`/recipe/${recipe.id}`} className="cook__bar-button">
            Exit
          </Link>
          <p className="cook__progress" aria-live="polite">
            {doneCount} of {steps.length} done
          </p>
          <button type="button" className="cook__bar-button" onClick={() => setIngredientsOpen(true)}>
            Ingredients
          </button>
        </nav>

        {progress.timers.length > 0 && (
          <ul className="cook__timers" aria-label="Running timers">
            {progress.timers.map((timer) => {
              const step = steps.find((s) => s.id === timer.stepId)
              const finished = isFinished(timer, now)
              const paused = timer.endsAt == null
              return (
                <li key={timer.id} className={'cook__timer' + (finished ? ' cook__timer--done' : '')}>
                  <button type="button" className="cook__timer-label" onClick={() => handleTimerTap(timer.stepId)}>
                    <span className="cook__timer-step">
                      Step {step?.position} · {step?.text}
                    </span>
                    <span className="cook__timer-time">
                      {finished ? 'Done!' : formatCountdown(remainingMs(timer, now))}
                      {paused && <span className="cook__timer-paused"> paused</span>}
                    </span>
                  </button>
                  {!finished && (
                    <button
                      type="button"
                      className="cook__icon-button"
                      aria-label={paused ? `Resume step ${step?.position} timer` : `Pause step ${step?.position} timer`}
                      onClick={() => (paused ? resumeTimer(timer.id) : pauseTimer(timer.id))}
                    >
                      {paused ? <PlayIcon /> : <PauseIcon />}
                    </button>
                  )}
                  <button
                    type="button"
                    className="cook__icon-button"
                    aria-label={`Cancel step ${step?.position} timer`}
                    onClick={() => cancelTimer(timer.id)}
                  >
                    <CrossIcon />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <ol className="cook__steps">
        {steps.map((step) => {
          const done = progress.doneStepIds.includes(step.id)
          const isCurrent = step.id === currentId
          const hasTimer = progress.timers.some((t) => t.stepId === step.id)
          return (
            <li
              key={step.id}
              ref={(el) => (el ? stepRefs.current.set(step.id, el) : stepRefs.current.delete(step.id))}
              className={'cook__step' + (isCurrent ? ' cook__step--current' : '') + (done ? ' cook__step--done' : '')}
              aria-current={isCurrent ? 'step' : undefined}
              onClick={() => setCurrent(id, step.id)}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={done}
                aria-label={`Step ${step.position} done`}
                className="cook__tick"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleDone(id, step.id)
                }}
              >
                {done && <TickIcon />}
              </button>
              <div className="cook__step-body">
                <p className="cook__step-number">Step {step.position}</p>
                <p className="cook__step-text">{step.text}</p>
                {step.timerSeconds != null && !hasTimer && (
                  <button
                    type="button"
                    className="cook__start-timer"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStartTimer(step)
                    }}
                  >
                    Start {formatTotalTime(null, Math.round(step.timerSeconds / 60))}
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <div className="cook__bottom">
        {allDone ? (
          <div className="cook__finished">
            <p className="cook__finished-text">All done. Enjoy!</p>
            <Link to={`/recipe/${recipe.id}`} className="cook__button cook__button--primary">
              Back to recipe
            </Link>
          </div>
        ) : (
          <button type="button" className="cook__button cook__button--primary" onClick={handleDoneNext}>
            Done, next
          </button>
        )}
      </div>

      <Dialog
        open={askResume}
        title="Pick up where you left off?"
        message={`${doneCount} of ${steps.length} steps done.`}
        cancelLabel="Start over"
        confirmLabel="Continue"
        onCancel={() => {
          clearProgress(id)
          setAskResume(false)
        }}
        onConfirm={() => setAskResume(false)}
        onDismiss={() => setAskResume(false)}
      />

      <Sheet open={ingredientsOpen} title="Ingredients" closeLabel="Close" onClose={() => setIngredientsOpen(false)}>
        <p className="cook__muted">For {servings} {servings === 1 ? 'serving' : 'servings'}</p>
        {groupIngredients(recipe.ingredients).map(({ group, items }) => (
          <div key={group ?? '_ungrouped'}>
            {group && <h3 className="cook__group">{group}</h3>}
            <ul className="cook__ingredients">
              {items.map((ing) => {
                const got = progress.gotIngredientIds.includes(ing.id)
                const amount = formatAmount(scaleQuantity(ing.quantity, recipe.servings, servings), ing.unit)
                return (
                  <li key={ing.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={got}
                      className={'cook__ingredient' + (got ? ' cook__ingredient--got' : '')}
                      onClick={() => toggleGot(id, ing.id)}
                    >
                      <span className="cook__tick cook__tick--small" aria-hidden="true">
                        {got && <TickIcon />}
                      </span>
                      <span>
                        {[amount, ing.item].filter(Boolean).join(' ')}
                        {ing.note && <span className="cook__muted">, {ing.note}</span>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </Sheet>
    </main>
  )
}

function TickIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d="M8 5v14M16 5v14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d="M7 4.5v15l12-7.5z" fill="currentColor" />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
