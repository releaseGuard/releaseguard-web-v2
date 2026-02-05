// lib/supabaseClient.ts

import { createClient } from '@supabase/supabase-js'

// Supabase client create karna
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,   // .env.local me jo Project URL hai
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // .env.local me jo anon/publishable key hai
)
