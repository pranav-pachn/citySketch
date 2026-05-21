import dotenv from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Load from project root .env since backend_ai is a subdirectory
dotenv.config({ path: resolve(__dirname, '../../../.env') })

export const env = {
  PORT: process.env.PORT || 3001,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_API_KEYS: process.env.GROQ_API_KEYS,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_API_KEYS: process.env.OPENROUTER_API_KEYS,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_API_KEYS: process.env.GEMINI_API_KEYS,
  LLM_PROVIDER: process.env.LLM_PROVIDER || 'groq',
}

// CORS_ALLOWLIST: comma-separated domains (e.g. https://example.com, http://localhost:5173)
export const CORS_ALLOWLIST = (process.env.CORS_ALLOWLIST || '').split(/[,\s]+/).filter(Boolean)

export function validateEnv() {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    console.warn('⚠️  Supabase environment variables appear to be missing. Persistence may fail.')
  }

  const hasAnyLLMKey = Boolean(env.OPENROUTER_API_KEY || env.OPENROUTER_API_KEYS || env.GEMINI_API_KEY || env.GEMINI_API_KEYS || env.GROQ_API_KEY || env.GROQ_API_KEYS || env.OPENAI_API_KEY)
  if (!hasAnyLLMKey) {
    console.warn('⚠️  No LLM provider API keys detected. Generation endpoints will fail.')
  }

  if (CORS_ALLOWLIST.length === 0) {
    console.log('ℹ️  No CORS allowlist set; server will allow all origins by default. Set CORS_ALLOWLIST for production.')
  }
  return { ok: true }
}
