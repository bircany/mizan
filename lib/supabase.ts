import { createClient, SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (client) return client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    const dummyUrl = 'https://placeholder.supabase.co'
    const dummyKey = 'placeholder-key'
    client = createClient(dummyUrl, dummyKey)
    return client
  }

  client = createClient(supabaseUrl, supabaseAnonKey)
  return client
}

export const supabase = getClient()
