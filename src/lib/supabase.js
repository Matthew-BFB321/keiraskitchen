import { createClient } from '@supabase/supabase-js'

/*
 * The app's only Supabase client. Uses the publishable (anon) key, which is
 * safe in the browser because row level security limits every user to their
 * own rows. Never put the secret/service_role key in this app.
 *
 * Values come from .env.local (local) or Vercel's environment variables.
 * If they're missing, `supabase` is null and the Login screen says so.
 */
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && key ? createClient(url, key) : null
