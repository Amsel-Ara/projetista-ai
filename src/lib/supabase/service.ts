import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client for server-side operations that bypass RLS.
 * Used by API routes for:
 *   - Writing extraction results to documents / extracted_fields
 *   - Generating signed URLs for Supabase Storage
 *
 * NEVER expose this client to the browser.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL env vars')
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
