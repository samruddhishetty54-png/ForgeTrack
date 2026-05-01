import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local.')
}

if (supabaseAnonKey?.startsWith('sb_publishable')) {
  console.error('CRITICAL ERROR: You are using a Stripe Publishable Key instead of a Supabase Anon Key. Please go to your Supabase Dashboard > Settings > API and copy the "anon" "public" key.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

