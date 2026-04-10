import { NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { performExtraction, isExtractable } from '@/lib/ai/extract-document'

// Allow up to 60 seconds for upload + background extraction on Vercel
export const maxDuration = 60

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB

/** Sanitize filename for safe storage paths — remove spaces and special chars */
function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')                    // decompose accented chars
    .replace(/[\u0300-\u036f]/g, '')     // strip accent marks
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')  // replace anything else with _
    .replace(/_+/g, '_')                 // collapse multiple underscores
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's org
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 })
    }

    const orgId = profile.organization_id

    // 2. Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const applicationId = formData.get('application_id') as string | null

    if (!file || !applicationId) {
      return NextResponse.json(
        { error: 'Missing file or application_id' },
        { status: 400 }
      )
    }

    // 3. Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB` },
        { status: 400 }
      )
    }

    // 4. Upload to Supabase Storage
    const fileId = crypto.randomUUID()
    const safeName = sanitizeFilename(file.name)
    const storagePath = `${orgId}/${applicationId}/${fileId}_${safeName}`
    const mimeType = file.type || 'application/octet-stream'

    const serviceClient = createServiceClient()
    const { error: uploadError } = await serviceClient
      .storage
      .from('documents')
      .upload(storagePath, file, {
        contentType: mimeType,
        upsert: false,
      })

    if (uploadError) {
      console.error('[upload] Storage error:', uploadError)
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // 5. Insert documents row
    const canExtract = isExtractable(mimeType)
    const initialStatus = canExtract ? 'pending' : 'completed' // non-extractable files are "completed" immediately (just stored)

    const { data: doc, error: insertError } = await serviceClient
      .from('documents')
      .insert({
        application_id: applicationId,
        organization_id: orgId,
        doc_type: 'unknown',
        file_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        status: initialStatus,
        uploaded_by: user.id,
      })
      .select('id, doc_type, file_name, file_path, file_size, status, expiry_date, created_at')
      .single()

    if (insertError || !doc) {
      console.error('[upload] Insert error:', insertError)
      return NextResponse.json(
        { error: `Failed to save document: ${insertError?.message}` },
        { status: 500 }
      )
    }

    // 6. Kick off AI extraction in the background (after response is sent)
    if (canExtract) {
      after(async () => {
        await performExtraction(doc.id, storagePath, applicationId, mimeType)
      })
    }

    // 7. Return immediately (optimistic)
    return NextResponse.json({ document: doc })
  } catch (err: any) {
    console.error('[upload] Unexpected error:', err)
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
