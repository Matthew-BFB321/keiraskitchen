import { useToast, dismissToast } from '../lib/toast.js'
import './Toast.css'

// App-styled message (never alert()). Mounted once in App.
export default function Toast() {
  const toast = useToast()
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <button key={toast.id} type="button" className="toast" onClick={dismissToast}>
          {toast.message}
        </button>
      )}
    </div>
  )
}
