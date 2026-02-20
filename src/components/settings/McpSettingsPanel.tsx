'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type UserMcpKey = {
  id: string
  name: string
  key_prefix: string
  status: 'active' | 'revoked' | 'expired'
  expires_at: string | null
  created_at: string
  last_used_at: string | null
}

type ClientId = 'claude_code' | 'codex' | 'cursor' | 'windsurf' | 'vscode' | 'antigravity'
type Guide = {
  id: ClientId
  name: string
  description: string
  configPath: string
  oneLineCommand: string | null
  configSnippet: string
  notes: string[]
}

const ENDPOINT_PLACEHOLDER = 'https://your-domain.com/api/mcp/mcp'

async function copyText(value: string) {
  await navigator.clipboard.writeText(value)
}

export default function McpSettingsPanel() {
  const [copied, setCopied] = useState<string | null>(null)
  const [endpoint, setEndpoint] = useState(ENDPOINT_PLACEHOLDER)
  const [selectedClient, setSelectedClient] = useState<ClientId>('claude_code')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [keyData, setKeyData] = useState<UserMcpKey | null>(null)
  const [name, setName] = useState('Personal MCP Key')
  const [expiresAt, setExpiresAt] = useState('')
  const [expiryPresetDays, setExpiryPresetDays] = useState<'30' | '60' | '90' | '120' | 'custom'>('90')
  const [plaintextKey, setPlaintextKey] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setEndpoint(`${window.location.origin}/api/mcp/mcp`)
  }, [])

  const guides = useMemo<Guide[]>(() => {
    const safeEndpoint = endpoint.trim() || ENDPOINT_PLACEHOLDER
    const apiKeyValue = plaintextKey ?? '<YOUR_MCP_KEY>'
    return [
      {
        id: 'claude_code',
        name: 'Claude Code',
        description: 'CLI에서 한 줄로 원격 MCP 서버를 등록할 수 있습니다.',
        configPath: '~/.claude.json (CLI가 자동 관리)',
        oneLineCommand: `claude mcp add --transport http techblog ${safeEndpoint} --header "Authorization: Bearer ${apiKeyValue}"`,
        configSnippet: `{
  "mcpServers": {
    "techblog": {
      "url": "${safeEndpoint}",
      "headers": {
        "Authorization": "Bearer ${apiKeyValue}"
      }
    }
  }
}`,
        notes: ['`claude mcp list`로 등록 상태를 확인하세요.', 'OAuth 서버가 아니라면 Bearer 헤더 방식이 가장 단순합니다.'],
      },
      {
        id: 'codex',
        name: 'Codex',
        description: 'one-line으로 mcp-remote 브리지를 등록해 즉시 사용할 수 있습니다.',
        configPath: '~/.codex/config.toml',
        oneLineCommand: `codex mcp add techblog --env TECHBLOG_MCP_KEY=${apiKeyValue} -- npx -y mcp-remote ${safeEndpoint} --header "Authorization: Bearer \${TECHBLOG_MCP_KEY}"`,
        configSnippet: `[mcp_servers.techblog]
command = "npx"
args = [
  "-y",
  "mcp-remote",
  "${safeEndpoint}",
  "--header",
  "Authorization: Bearer \${TECHBLOG_MCP_KEY}"
]

[mcp_servers.techblog.env]
TECHBLOG_MCP_KEY = "${apiKeyValue}"`,
        notes: ['`codex mcp list`로 서버를 확인하세요.', '프로젝트별이 아닌 전역 등록이 필요하면 `~/.codex/config.toml`을 사용하세요.'],
      },
      {
        id: 'cursor',
        name: 'Cursor',
        description: '프로젝트 단위 `.cursor/mcp.json`로 팀 공유가 가장 편합니다.',
        configPath: '.cursor/mcp.json (project) 또는 ~/.cursor/mcp.json (global)',
        oneLineCommand: null,
        configSnippet: `{
  "mcpServers": {
    "techblog": {
      "url": "${safeEndpoint}",
      "headers": {
        "Authorization": "Bearer ${apiKeyValue}"
      }
    }
  }
}`,
        notes: ['Cursor Settings > Features > MCP에서도 동일 설정을 입력할 수 있습니다.', '저장 후 MCP 목록에서 서버 상태를 새로고침하세요.'],
      },
      {
        id: 'windsurf',
        name: 'Windsurf',
        description: 'Cascade MCP 설정 파일에 `serverUrl`과 `headers`를 넣어 연결합니다.',
        configPath: '~/.codeium/windsurf/mcp_config.json',
        oneLineCommand: null,
        configSnippet: `{
  "mcpServers": {
    "techblog": {
      "serverUrl": "${safeEndpoint}",
      "headers": {
        "Authorization": "Bearer ${apiKeyValue}"
      }
    }
  }
}`,
        notes: ['Cascade 패널의 MCP 아이콘에서 Refresh를 눌러 반영하세요.', '팀 환경에서는 whitelist 정책에 의해 서버 추가가 제한될 수 있습니다.'],
      },
      {
        id: 'vscode',
        name: 'VS Code (Copilot Agent)',
        description: 'Agent 모드에서 `.vscode/mcp.json` 설정으로 MCP 서버를 연결합니다.',
        configPath: '.vscode/mcp.json',
        oneLineCommand: null,
        configSnippet: `{
  "servers": {
    "techblog": {
      "url": "${safeEndpoint}",
      "requestInit": {
        "headers": {
          "Authorization": "Bearer ${apiKeyValue}"
        }
      }
    }
  }
}`,
        notes: ['VS Code 1.99+ 및 Copilot Agent 모드가 필요합니다.', '설정 파일 상단의 Start 버튼으로 서버를 시작하세요.'],
      },
      {
        id: 'antigravity',
        name: 'Antigravity',
        description: 'Agent 패널에서 raw config(`mcp_config.json`)를 열어 서버를 추가합니다.',
        configPath: 'Antigravity MCP Store > Manage MCP Servers > View raw config',
        oneLineCommand: null,
        configSnippet: `{
  "mcpServers": {
    "techblog": {
      "serverUrl": "${safeEndpoint}",
      "headers": {
        "Authorization": "Bearer ${apiKeyValue}"
      }
    }
  }
}`,
        notes: ['저장 후 MCP 서버 목록에서 활성 상태를 확인하세요.', '권한/보안 정책에 따라 조직 단위 MCP 제한이 적용될 수 있습니다.'],
      },
    ]
  }, [endpoint, plaintextKey])

  const selectedGuide = useMemo(
    () => guides.find((guide) => guide.id === selectedClient) ?? guides[0],
    [guides, selectedClient],
  )

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/mcp/keys/me', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Failed to fetch key')
      setKeyData(payload.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch key')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleCopy = async (type: string, value: string) => {
    try {
      await copyText(value)
      setCopied(type)
      window.setTimeout(() => setCopied(null), 1600)
    } catch {
      setCopied(null)
    }
  }

  const createKey = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreating(true)

    try {
      let nextExpiresAt: string | null = null
      if (expiryPresetDays === 'custom') {
        nextExpiresAt = expiresAt || null
      } else {
        const days = Number(expiryPresetDays)
        const date = new Date()
        date.setDate(date.getDate() + days)
        nextExpiresAt = date.toISOString()
      }

      const response = await fetch('/api/mcp/keys/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          expires_at: nextExpiresAt,
        }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Failed to create MCP key')

      setKeyData(payload.data)
      setPlaintextKey(payload.plaintext_key ?? null)
      toast.success('MCP 키를 생성했습니다. 키 원문은 지금 한 번만 표시됩니다.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create MCP key')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
          <KeyRound className="size-4 text-primary" />
          MCP Key
        </h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">키 정보를 불러오는 중...</p>
        ) : keyData ? (
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Name:</span> {keyData.name}</p>
            <p><span className="text-muted-foreground">Prefix:</span> <span className="font-mono">{keyData.key_prefix}...</span></p>
            <p><span className="text-muted-foreground">Status:</span> {keyData.status}</p>
            <p><span className="text-muted-foreground">Expires:</span> {keyData.expires_at ?? '-'}</p>
            <p className="text-xs text-muted-foreground">계정당 MCP 키는 1개만 생성할 수 있습니다. 키가 필요 없으면 관리자에게 삭제를 요청하세요.</p>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={createKey}>
            <div className="space-y-2">
              <label htmlFor="mcp-key-name" className="text-sm font-medium">Key Name</label>
              <Input id="mcp-key-name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Expiration Preset</label>
              <div className="flex flex-wrap gap-2">
                {(['30', '60', '90', '120', 'custom'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setExpiryPresetDays(preset)}
                    className={`inline-flex h-9 items-center rounded-md border px-3 text-sm transition ${
                      expiryPresetDays === preset
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-foreground hover:bg-muted'
                    }`}
                  >
                    {preset === 'custom' ? '직접 입력' : `${preset}일`}
                  </button>
                ))}
              </div>
            </div>
            {expiryPresetDays === 'custom' ? (
              <div className="space-y-2">
                <label htmlFor="mcp-key-expire" className="text-sm font-medium">Custom Expiration</label>
                <Input
                  id="mcp-key-expire"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                생성 시점 기준 {expiryPresetDays}일 뒤 만료됩니다.
              </p>
            )}
            <Button type="submit" size="sm" disabled={creating || (expiryPresetDays === 'custom' && !expiresAt)}>
              {creating ? '생성 중...' : 'MCP 키 생성'}
            </Button>
          </form>
        )}
      </section>

      {plaintextKey ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-900/40 dark:bg-amber-900/20">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Plaintext Key (show once)</h3>
            <Button size="sm" variant="outline" onClick={() => void handleCopy('plaintext', plaintextKey)}>
              <Copy className="size-4" />
              {copied === 'plaintext' ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <pre className="overflow-x-auto rounded-md border border-amber-200 bg-background p-3 text-xs"><code>{plaintextKey}</code></pre>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 space-y-3">
          <div>
            <h2 className="text-base font-semibold">MCP Client Quick Setup</h2>
            <p className="text-sm text-muted-foreground">키 생성 후 아래에서 클라이언트를 선택해 바로 복사/적용하세요.</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="mcp-endpoint" className="text-sm font-medium">MCP Endpoint</label>
            <Input
              id="mcp-endpoint"
              value={endpoint}
              onChange={(event) => setEndpoint(event.target.value)}
              placeholder={ENDPOINT_PLACEHOLDER}
            />
            <p className="text-xs text-muted-foreground">실제 배포 도메인 기준 MCP 엔드포인트를 확인해 주세요. 예: `https://your-domain.com/api/mcp/mcp`</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {guides.map((guide) => (
            <button
              key={guide.id}
              type="button"
              onClick={() => setSelectedClient(guide.id)}
              className={`rounded-md border px-3 py-2 text-sm transition ${
                selectedClient === guide.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background hover:bg-muted'
              }`}
            >
              {guide.name}
            </button>
          ))}
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-background p-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">{selectedGuide.name}</h3>
            <p className="text-sm text-muted-foreground">{selectedGuide.description}</p>
            <p className="text-xs text-muted-foreground">Config: <span className="font-mono">{selectedGuide.configPath}</span></p>
          </div>

          {selectedGuide.oneLineCommand ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">One-line command</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleCopy(`${selectedGuide.id}-command`, selectedGuide.oneLineCommand ?? '')}
                >
                  {copied === `${selectedGuide.id}-command` ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied === `${selectedGuide.id}-command` ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <pre className="overflow-x-auto rounded-md border border-border bg-slate-950 p-3 text-xs leading-5 text-slate-100"><code>{selectedGuide.oneLineCommand}</code></pre>
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Config snippet</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void handleCopy(`${selectedGuide.id}-config`, selectedGuide.configSnippet)}
              >
                {copied === `${selectedGuide.id}-config` ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied === `${selectedGuide.id}-config` ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <pre className="overflow-x-auto rounded-md border border-border bg-slate-950 p-3 text-xs leading-5 text-slate-100"><code>{selectedGuide.configSnippet}</code></pre>
          </div>

          <ul className="space-y-1 text-xs text-muted-foreground">
            {selectedGuide.notes.map((note) => (
              <li key={note}>- {note}</li>
            ))}
          </ul>

          {!plaintextKey ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
              현재는 실키 값이 없어 <span className="font-mono">{'<YOUR_MCP_KEY>'}</span> placeholder가 들어갑니다. 새 키 생성 직후 원문 키가 자동 반영됩니다.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  )
}
