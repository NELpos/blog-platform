import { NextResponse } from 'next/server'
import { guardAdminApiRequest } from '@/lib/admin/guard'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH() {
  return NextResponse.json(
    { error: 'Admin can only delete keys.' },
    { status: 403 },
  )
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await guardAdminApiRequest()
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()

  const result = await supabase
    .from('api_keys')
    .delete()
    .eq('id', id)

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
