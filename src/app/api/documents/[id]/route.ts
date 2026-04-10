import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(request: Request, context: RouteContext) {
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

    // 3. Fetch the document and verify org ownership
    const serviceClient = createServiceClient()
    const { data: doc, error: docError } = await serviceClient
      .from('documents')
      .select('file_path, organization_id')
      .eq('id', id)
      .single()

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (doc.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 4. Delete from Supabase Storage
    const { error: storageError } = await serviceClient
      .storage
      .from('documents')
      .remove([doc.file_path])

    if (storageError) {
      console.error('[delete] Storage error:', storageError)
      // Continue anyway — orphaned storage files are acceptable; DB row is the source of truth
    }

    // 5. Delete from documents table (cascades to extracted_fields)
    const { error: dbError } = await serviceClient
      .from('documents')
      .delete()
      .eq('id', id)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[delete] Error:', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
