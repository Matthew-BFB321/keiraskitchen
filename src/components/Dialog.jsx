import { useEffect, useId, useRef } from 'react'
import './Dialog.css'

/**
 * Shared confirmation dialog. Use instead of window.alert()/confirm().
 *
 * destructive: red confirm button. Only for actions that lose data, and the
 * message must name exactly what is lost, e.g.
 *   title="Delete Lemon Drizzle Cake?"
 *   message="The recipe, its 9 ingredients, 6 steps and your notes will be deleted."
 *   confirmLabel="Delete recipe"
 *
 * Omit cancelLabel for a single-button (alert-style) dialog.
 *
 * onDismiss (optional) handles Escape / back gesture / tapping outside.
 * Defaults to onCancel; set it when cancel isn't the safe choice.
 *
 * secondaryLabel + onSecondary (optional) add a third, neutral button. With
 * three buttons they stack: secondary, confirm, cancel (they don't fit in a row).
 */
export default function Dialog({
  open,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel,
  secondaryLabel,
  destructive = false,
  onConfirm,
  onCancel,
  onSecondary,
  onDismiss,
}) {
  const ref = useRef(null)
  const titleId = useId()
  const messageId = useId()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  // Escape key / back gesture fires 'cancel'; treat it like the cancel button.
  function handleCancel(event) {
    event.preventDefault()
    ;(onDismiss ?? onCancel ?? onConfirm)?.()
  }

  // Tapping the scrim (outside the panel) dismisses, but only when there is a cancel option.
  function handleClick(event) {
    if (event.target === ref.current && cancelLabel) (onDismiss ?? onCancel)?.()
  }

  const cancelButton = cancelLabel && (
    <button type="button" className="dialog__button" onClick={onCancel}>
      {cancelLabel}
    </button>
  )
  const confirmButton = (
    <button
      type="button"
      className={'dialog__button ' + (destructive ? 'dialog__button--destructive' : 'dialog__button--primary')}
      onClick={onConfirm}
      autoFocus={!destructive}
    >
      {confirmLabel}
    </button>
  )

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      aria-describedby={message ? messageId : undefined}
      onCancel={handleCancel}
      onClick={handleClick}
    >
      <div className="dialog__panel">
        <h2 id={titleId} className="dialog__title">{title}</h2>
        {message && <p id={messageId} className="dialog__message">{message}</p>}
        <div className={'dialog__actions' + (secondaryLabel ? ' dialog__actions--stacked' : '')}>
          {secondaryLabel ? (
            <>
              <button type="button" className="dialog__button" onClick={onSecondary}>
                {secondaryLabel}
              </button>
              {confirmButton}
              {cancelButton}
            </>
          ) : (
            <>
              {cancelButton}
              {confirmButton}
            </>
          )}
        </div>
      </div>
    </dialog>
  )
}
