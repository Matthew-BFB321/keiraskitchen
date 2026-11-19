import { useEffect } from 'react'
import { useAllTimers, dismissTimer } from '../lib/cookProgress.js'
import { isFinished } from '../lib/cookTimers.js'
import { getRecipe } from '../lib/recipeStore.js'
import { startAlarm, stopAlarm } from '../lib/alarm.js'
import { useNow } from '../lib/useNow.js'
import Dialog from './Dialog.jsx'
import './TimerAlarmHost.css'

// Mounted once in App: rings and shows "Timer done" on whatever screen she's on.
export default function TimerAlarmHost() {
  const timers = useAllTimers()
  const now = useNow(timers.some((t) => t.endsAt != null))
  const finished = timers.filter((t) => isFinished(t, now))
  const current = finished[0] ?? null
  const ringing = finished.length > 0

  useEffect(() => {
    if (ringing) startAlarm()
    else stopAlarm()
  }, [ringing])

  let message = ''
  if (current) {
    const recipe = getRecipe(current.recipeId)
    const step = recipe?.steps.find((s) => s.id === current.stepId)
    message = recipe && step ? `${recipe.title}, step ${step.position}: ${step.text}` : 'A cooking timer has finished.'
  }

  return (
    <div className="timer-alarm">
      <Dialog
        open={current !== null}
        title="Timer done"
        message={message}
        confirmLabel="Stop alarm"
        onConfirm={() => current && dismissTimer(current.id)}
      />
    </div>
  )
}
