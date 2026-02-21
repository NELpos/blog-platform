import { spawnSync } from 'node:child_process'

function runEslintJson() {
  const result = spawnSync(
    'pnpm',
    ['exec', 'eslint', '.', '--format', 'json'],
    { encoding: 'utf8' }
  )

  const stdout = result.stdout || '[]'
  let parsed = []
  try {
    parsed = JSON.parse(stdout)
  } catch {
    parsed = []
  }

  return {
    status: result.status ?? 1,
    parsed,
    stderr: result.stderr || '',
  }
}

function summarize(files) {
  const byRule = {}
  let errors = 0
  let warnings = 0
  let fixableCount = 0
  let nonFixableCount = 0

  for (const file of files) {
    for (const msg of file.messages || []) {
      const ruleId = msg.ruleId || 'unknown'
      byRule[ruleId] = (byRule[ruleId] || 0) + 1
      if (msg.severity === 2) errors += 1
      if (msg.severity === 1) warnings += 1
      if (msg.fix) fixableCount += 1
      else nonFixableCount += 1
    }
  }

  return {
    summary: {
      filesScanned: files.length,
      errors,
      warnings,
      issueCount: errors + warnings,
      fixableCount,
      nonFixableCount,
    },
    byRule,
    files: files
      .filter((f) => (f.messages || []).length > 0)
      .map((f) => ({
        filePath: f.filePath,
        issueCount: f.messages.length,
      })),
  }
}

const lintResult = runEslintJson()
const report = summarize(lintResult.parsed)

const payload = {
  ...report,
  exitCode: lintResult.status,
}

console.log(JSON.stringify(payload, null, 2))

const hasIssues = (payload.summary?.issueCount || 0) > 0
process.exit(lintResult.status === 0 && !hasIssues ? 0 : 1)
