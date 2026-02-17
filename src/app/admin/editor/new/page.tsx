import { redirect } from 'next/navigation'

export default function LegacyNewEditorRedirectPage() {
  redirect('/studio/new')
}
