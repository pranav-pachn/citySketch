import { createClient } from '@supabase/supabase-js'
import { env } from './env.js'

if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
  throw new Error('Supabase URL or Anon Key is missing from environment variables')
}

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
