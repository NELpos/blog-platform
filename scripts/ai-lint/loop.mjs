import { spawnSync } from 'node:child_process'

const MAX_ATTEMPTS = 3

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  return {
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  }
}

function getReport() {
  const check = run('node', ['scripts/ai-lint/check.mjs'])
  let report = null
  try {
    report = JSON.parse(check.stdout || '{}')
  } catch {
    report = null
  }
  return {
    ok: check.status === 0 && (report?.summary?.issueCount || 0) === 0,
    report,
    check,
  }
}

function topRules(byRule = {}, limit = 5) {
  return Object.entries(byRule)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([ruleId, count]) => ({ ruleId, count }))
}

const history = []

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  const status = getReport()
  history.push({
    attempt,
    ok: status.ok,
    summary: status.report?.summary || null,
    topRules: topRules(status.report?.byRule || {}),
  })

  if (status.ok) {
    console.log(JSON.stringify({
      success: true,
      attemptsUsed: attempt,
      history,
    }, null, 2))
    process.exit(0)
  }

  if (attempt === 1) {
    const fix = run('pnpm', ['lint:fix'])
    history.push({
      attempt,
      action: 'autofix',
      command: 'pnpm lint:fix',
      status: fix.status,
    })
    continue
  }

  if (attempt < MAX_ATTEMPTS) {
    console.error(
      `Attempt ${attempt} failed. Apply manual fixes, then rerun 'pnpm ai-lint:loop'.`
    )
    console.log(JSON.stringify({
      success: false,
      phase: 'manual_fix_required',
      attemptsUsed: attempt,
      maxAttempts: MAX_ATTEMPTS,
      history,
    }, null, 2))
    process.exit(1)
  }
}

console.log(JSON.stringify({
  success: false,
  phase: 'blocker',
  attemptsUsed: MAX_ATTEMPTS,
  maxAttempts: MAX_ATTEMPTS,
  history,
  recommendation: 'Create blocker report with root cause and options.',
}, null, 2))

process.exit(1)
