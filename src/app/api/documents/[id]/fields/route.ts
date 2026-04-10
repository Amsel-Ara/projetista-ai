import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params

    // 1. Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get user's org
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 })
    }

    // 3. Verify document ownership
    const serviceClient = createServiceClient()
    const { data: doc, error: docError } = await serviceClient
      .from('documents')
      .select('id, organization_id')
      .eq('id', id)
      .single()

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (doc.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 4. Parse the update payload
    const body = await request.json()
    const { fields, expiry_date, doc_type } = body as {
      fields?: Record<string, any>
      expiry_date?: string | null
      doc_type?: string
    }

    // 5. Update extracted_fields if provided
    if (fields) {
      await serviceClient
        .from('extracted_fields')
        .upsert({
          document_id: id,
          fields,
          manually_edited: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'document_id' })
    }

    // 6. Update documents table if expiry_date or doc_type changed
    const docUpdates: Record<string, any> = {}
    if (expiry_date !== undefined) docUpdates.expiry_date = expiry_date
    if (doc_type !== undefined) docUpdates.doc_type = doc_type

    if (Object.keys(docUpdates).length > 0) {
      await serviceClient
        .from('documents')
        .update(docUpdates)
        .eq('id', id)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[fields] Error:', err)
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
