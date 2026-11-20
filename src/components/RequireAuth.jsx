import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth, refreshAuth } from '../lib/auth.js'
import { loadRecipes, useStoreStatus } from '../lib/recipeStore.js'
import './RequireAuth.css'

/*
 * Wraps every route except /login. Logged out → /login (then back here).
 * Logged in → loads her recipes, showing a simple loading or error state
 * only when nothing is saved on the phone yet.
 */
export default function RequireAuth() {
  const { status, user } = useAuth()
  const storeStatus = useStoreStatus()
  const location = useLocation()
  const userId = user?.id

  useEffect(() => {
    if (status === 'in') loadRecipes(userId)
    else if (status === 'offline') loadRecipes(userId, { offline: true })
  }, [status, userId])

  if (status === 'loading') return <Gate message="Loading…" />
  if (status === 'out') return <Navigate to="/login" replace state={{ from: location }} />
  if (storeStatus === 'loading') return <Gate message="Loading your recipes…" />
  if (storeStatus === 'error') {
    return (
      <Gate message="Couldn't load your recipes.">
        <p className="gate__muted">Check your connection.</p>
        <button
          type="button"
          className="gate__button"
          onClick={() => (status === 'in' ? loadRecipes(userId) : refreshAuth())}
        >
          Try again
        </button>
      </Gate>
    )
  }
  return <Outlet />
}

function Gate({ message, children }) {
  return (
    <main className="gate">
      <p className="gate__message">{message}</p>
      {children}
    </main>
  )
}
