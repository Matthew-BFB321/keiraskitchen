import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('./supabase.js', () => ({ supabase: null }))
const { friendlyAuthError, signIn, SETUP_MISSING } = await import('./auth.js')

afterEach(() => vi.unstubAllGlobals())

describe('friendlyAuthError', () => {
  it('says "Wrong email or password." for bad credentials', () => {
    expect(friendlyAuthError({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe(
      'Wrong email or password.',
    )
    expect(friendlyAuthError({ message: 'Invalid login credentials' })).toBe('Wrong email or password.')
  })

  it('explains a connection problem', () => {
    const message = "Couldn't reach the server. Check your connection and try again."
    expect(friendlyAuthError({ name: 'AuthRetryableFetchError', message: 'Failed to fetch' })).toBe(message)
    expect(friendlyAuthError(new TypeError('Failed to fetch'))).toBe(message)
    vi.stubGlobal('navigator', { onLine: false })
    expect(friendlyAuthError({ message: 'Something odd' })).toBe(message)
  })

  it('falls back to a general message', () => {
    expect(friendlyAuthError({ message: 'Request rate limit reached' })).toBe("Couldn't log in. Please try again.")
  })

  it('returns null when there is no error', () => {
    expect(friendlyAuthError(null)).toBeNull()
  })
})

describe('signIn without settings', () => {
  it('says the app is not set up instead of crashing', async () => {
    expect(await signIn('keira@example.com', 'secret')).toEqual({ error: SETUP_MISSING })
  })
})
