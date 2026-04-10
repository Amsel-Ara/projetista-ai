import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: Request, context: RouteContext) {
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

    // 4. Generate signed URL (valid for 60 minutes)
    const { data: signedUrl, error: urlError } = await serviceClient
      .storage
      .from('documents')
      .createSignedUrl(doc.file_path, 3600) // 60 minutes

    if (urlError || !signedUrl) {
      return NextResponse.json(
        { error: `Failed to create signed URL: ${urlError?.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: signedUrl.signedUrl })
  } catch (err: any) {
    console.error('[signed-url] Error:', err)
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
