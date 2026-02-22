import { createClient } from '@supabase/supabase-js'

// Supabase クライアント - クライアントサイドでのみ作成
export const supabase = typeof window !== 'undefined'
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  : null as unknown as ReturnType<typeof createClient>
