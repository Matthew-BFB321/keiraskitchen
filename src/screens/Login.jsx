import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, signIn, SETUP_MISSING } from '../lib/auth.js'
import { supabase } from '../lib/supabase.js'
import './Login.css'

// Email and password only; accounts are created in Supabase, there's no sign-up.
export default function Login() {
  const { status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from
  const backTo = from ? `${from.pathname}${from.search ?? ''}` : '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(supabase ? null : SETUP_MISSING)

  if (status === 'in') return <Navigate to={backTo} replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    const result = await signIn(email, password)
    setBusy(false)
    if (result.error) setError(result.error)
    else navigate(backTo, { replace: true })
  }

  return (
    <main className="login">
      <h1 className="login__title">Keira's Kitchen</h1>
      <form className="login__form" onSubmit={handleSubmit}>
        <label className="login__field">
          <span className="login__label">Email</span>
          <input
            className="login__input"
            type="email"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="login__field">
          <span className="login__label">Password</span>
          <input
            className="login__input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p className="login__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="login__button" disabled={busy || !supabase}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </main>
  )
}
