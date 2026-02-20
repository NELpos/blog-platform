import McpSettingsPanel from '@/components/settings/McpSettingsPanel'

export default function McpSettingsPage() {
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">MCP settings</h1>
        <p className="text-sm text-muted-foreground">MCP client 연결을 위한 명령과 설정 예시를 제공합니다.</p>
      </div>
      <McpSettingsPanel />
    </div>
  )
}
