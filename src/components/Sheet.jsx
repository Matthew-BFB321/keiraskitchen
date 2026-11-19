import { useEffect, useId, useRef } from 'react'
import './Sheet.css'

/**
 * Bottom sheet. Closes on Escape, a tap on the backdrop, or the close
 * button (all call onClose). Long content scrolls inside the sheet.
 */
export default function Sheet({ open, title, onClose, closeLabel = 'Cancel', children }) {
  const ref = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  function handleCancel(event) {
    event.preventDefault()
    onClose()
  }

  function handleClick(event) {
    if (event.target === ref.current) onClose()
  }

  return (
    <dialog ref={ref} className="sheet" aria-labelledby={titleId} onCancel={handleCancel} onClick={handleClick}>
      <div className="sheet__panel">
        <h2 id={titleId} className="sheet__title">{title}</h2>
        {children}
        <button type="button" className="sheet__cancel" onClick={onClose}>
          {closeLabel}
        </button>
      </div>
    </dialog>
  )
}
