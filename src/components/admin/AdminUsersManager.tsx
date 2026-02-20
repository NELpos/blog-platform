'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type UserRow = {
  id: string
  username: string
  email: string
  display_name: string | null
  account_role: 'owner' | 'editor' | 'viewer'
  account_status: 'active' | 'pending' | 'suspended'
  last_active_at: string | null
  created_at: string
}

export default function AdminUsersManager() {
  const [rows, setRows] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createName, setCreateName] = useState('')
  const [createRole, setCreateRole] = useState<'owner' | 'editor' | 'viewer'>('viewer')
  const [createStatus, setCreateStatus] = useState<'active' | 'pending' | 'suspended'>('pending')

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((row) => (
      row.email.toLowerCase().includes(query)
      || (row.display_name ?? '').toLowerCase().includes(query)
      || row.username.toLowerCase().includes(query)
    ))
  }, [rows, search])

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/users', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Failed to fetch users')
      setRows(payload.data ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const createUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createEmail,
          display_name: createName,
          role: createRole,
          status: createStatus,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Failed to create user')
      setCreateEmail('')
      setCreateName('')
      toast.success(`사용자 생성 완료 (임시 비밀번호: ${payload.temp_password})`)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create user')
    }
  }

  const patchUser = async (id: string, updates: Partial<UserRow>) => {
    const response = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error ?? 'Failed to update user')
    setRows((current) => current.map((row) => (row.id === id ? payload.data : row)))
  }

  const deleteUser = async (id: string) => {
    if (!window.confirm('이 사용자를 삭제할까요?')) return
    try {
      const response = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Failed to delete user')
      setRows((current) => current.filter((row) => row.id !== id))
      toast.success('사용자를 삭제했습니다.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete user')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">SSO 로그인 사용자 계정과 권한 상태를 관리합니다.</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <form className="grid gap-3 md:grid-cols-6" onSubmit={createUser}>
          <Input
            value={createEmail}
            onChange={(event) => setCreateEmail(event.target.value)}
            placeholder="email"
            className="md:col-span-2"
            required
          />
          <Input
            value={createName}
            onChange={(event) => setCreateName(event.target.value)}
            placeholder="display name"
            className="md:col-span-2"
            required
          />
          <select
            value={createRole}
            onChange={(event) => setCreateRole(event.target.value as 'owner' | 'editor' | 'viewer')}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="owner">owner</option>
            <option value="editor">editor</option>
            <option value="viewer">viewer</option>
          </select>
          <select
            value={createStatus}
            onChange={(event) => setCreateStatus(event.target.value as 'active' | 'pending' | 'suspended')}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="active">active</option>
            <option value="pending">pending</option>
            <option value="suspended">suspended</option>
          </select>
          <Button type="submit" className="md:col-span-6 md:justify-self-end" size="sm">
            <Plus className="size-4" />
            Create User
          </Button>
        </form>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name/email/username" />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Last Active</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={5}>Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={5}>No users</td>
                </tr>
              ) : filtered.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <p className="font-medium">{row.display_name ?? row.username}</p>
                    <p className="text-xs text-muted-foreground">{row.email}</p>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.account_role}
                      onChange={(event) => void patchUser(row.id, { account_role: event.target.value as UserRow['account_role'] })}
                      className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                    >
                      <option value="owner">owner</option>
                      <option value="editor">editor</option>
                      <option value="viewer">viewer</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.account_status}
                      onChange={(event) => void patchUser(row.id, { account_status: event.target.value as UserRow['account_status'] })}
                      className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                    >
                      <option value="active">active</option>
                      <option value="pending">pending</option>
                      <option value="suspended">suspended</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{row.last_active_at ?? '-'}</td>
                  <td className="px-3 py-2 text-right">
                    <Button type="button" size="sm" variant="outline" onClick={() => void deleteUser(row.id)}>
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
