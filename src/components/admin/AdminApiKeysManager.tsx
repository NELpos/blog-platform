'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type UserOption = {
  id: string
  display_name: string | null
  email: string
}

type ApiKeyRow = {
  id: string
  user_id: string
  name: string
  key_prefix: string
  status: 'active' | 'revoked' | 'expired'
  created_at: string
  last_used_at: string | null
  expires_at: string | null
  owner: UserOption | null
}

export default function AdminApiKeysManager() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([])

  const load = async () => {
    const keysResponse = await fetch('/api/admin/api-keys', { cache: 'no-store' })
    const keysPayload = await keysResponse.json()

    if (!keysResponse.ok) throw new Error(keysPayload.error ?? 'Failed to load keys')

    setKeys(keysPayload.data ?? [])
  }

  useEffect(() => {
    load().catch((error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to load')
    })
  }, [])

  const remove = async (id: string) => {
    if (!window.confirm('이 키를 삭제할까요?')) return
    try {
      const response = await fetch(`/api/admin/api-keys/${id}`, { method: 'DELETE' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Failed to delete key')
      setKeys((current) => current.filter((key) => key.id !== id))
      toast.success('키를 삭제했습니다.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete key')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">MCP API Key Management</h1>
        <p className="text-sm text-muted-foreground">관리자는 MCP 키를 조회/삭제만 할 수 있습니다.</p>
      </div>

      <section className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Key</th>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Last Used</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>No API keys</td>
              </tr>
            ) : keys.map((key) => (
              <tr key={key.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <p className="font-medium">{key.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{key.key_prefix}...</p>
                </td>
                <td className="px-3 py-2 text-xs">
                  <p>{key.owner?.display_name ?? '-'}</p>
                  <p className="text-muted-foreground">{key.owner?.email ?? '-'}</p>
                </td>
                <td className="px-3 py-2">{key.status}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{key.created_at}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{key.last_used_at ?? '-'}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => void remove(key.id)}>
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
