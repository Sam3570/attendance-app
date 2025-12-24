import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,      // ✅ keeps user logged in after tab close
      autoRefreshToken: true,    // ✅ refreshes token automatically
      detectSessionInUrl: true,  // ✅ required for redirects / OAuth
      storage: typeof window !== 'undefined'
        ? window.localStorage     // ✅ force localStorage
        : undefined
    }
  }
)
