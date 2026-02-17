import { notFound } from 'next/navigation'
import EditorInputReproClient from './repro-client'

export default function EditorInputReproPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <EditorInputReproClient />
}
