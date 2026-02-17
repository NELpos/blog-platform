#!/usr/bin/env ts-node
/**
 * 코드 복잡도 분석 스크립트
 *
 * TypeScript/JavaScript 파일의 함수 복잡도를 분석합니다.
 *
 * 측정 항목:
 * - Cyclomatic Complexity: 코드 경로의 수
 * - Lines of Code: 함수 라인 수
 * - Max Nesting Depth: 최대 중첩 깊이
 * - Parameter Count: 매개변수 개수
 *
 * 사용법:
 *   ts-node analyze-complexity.ts <file-path>
 *   ts-node analyze-complexity.ts <directory-path>
 *   ts-node analyze-complexity.ts <file-path> --threshold 10
 *
 * 또는 package.json 스크립트로:
 *   pnpm run analyze-complexity src/
 */

import * as ts from 'typescript'
import * as fs from 'fs'
import * as path from 'path'

interface FunctionComplexity {
  name: string
  filePath: string
  lineNumber: number
  cyclomaticComplexity: number
  linesOfCode: number
  maxNestingDepth: number
  parameterCount: number
}

class ComplexityAnalyzer {
  private functions: FunctionComplexity[] = []

  analyze(filePath: string): FunctionComplexity[] {
    try {
      const source = fs.readFileSync(filePath, 'utf-8')
      const sourceFile = ts.createSourceFile(
        filePath,
        source,
        ts.ScriptTarget.Latest,
        true
      )

      this.visitNode(sourceFile)
      return this.functions
    } catch (error) {
      console.error(`❌ 분석 오류: ${filePath} - ${error}`)
      return []
    }
  }

  private visitNode(node: ts.Node): void {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node)
    ) {
      this.analyzeFunctionNode(node)
    }

    ts.forEachChild(node, (child) => this.visitNode(child))
  }

  private analyzeFunctionNode(
    node:
      | ts.FunctionDeclaration
      | ts.MethodDeclaration
      | ts.ArrowFunction
      | ts.FunctionExpression
  ): void {
    const sourceFile = node.getSourceFile()
    const name = this.getFunctionName(node)
    const lineNumber = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1

    const complexity = this.calculateComplexity(node)
    const lines = this.countLines(node, sourceFile)
    const maxNesting = this.calculateMaxNesting(node)
    const params = this.countParameters(node)

    this.functions.push({
      name,
      filePath: sourceFile.fileName,
      lineNumber,
      cyclomaticComplexity: complexity,
      linesOfCode: lines,
      maxNestingDepth: maxNesting,
      parameterCount: params,
    })
  }

  private getFunctionName(
    node:
      | ts.FunctionDeclaration
      | ts.MethodDeclaration
      | ts.ArrowFunction
      | ts.FunctionExpression
  ): string {
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
      return node.name?.getText() || '(anonymous)'
    }

    // Arrow function이나 function expression인 경우
    const parent = node.parent
    if (ts.isVariableDeclaration(parent) && parent.name) {
      return parent.name.getText()
    }
    if (ts.isPropertyAssignment(parent) && parent.name) {
      return parent.name.getText()
    }

    return '(anonymous)'
  }

  private calculateComplexity(node: ts.Node): number {
    let complexity = 1 // 기본 경로

    const visit = (n: ts.Node) => {
      // 조건문, 반복문, 논리 연산자 등 분기점 카운트
      if (
        ts.isIfStatement(n) ||
        ts.isConditionalExpression(n) ||
        ts.isWhileStatement(n) ||
        ts.isDoStatement(n) ||
        ts.isForStatement(n) ||
        ts.isForInStatement(n) ||
        ts.isForOfStatement(n) ||
        ts.isCaseClause(n) ||
        ts.isCatchClause(n)
      ) {
        complexity++
      }

      // 논리 연산자 (&&, ||)
      if (ts.isBinaryExpression(n)) {
        if (
          n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          n.operatorToken.kind === ts.SyntaxKind.BarBarToken
        ) {
          complexity++
        }
      }

      ts.forEachChild(n, visit)
    }

    ts.forEachChild(node, visit)
    return complexity
  }

  private countLines(node: ts.Node, sourceFile: ts.SourceFile): number {
    const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line
    const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line
    return endLine - startLine + 1
  }

  private calculateMaxNesting(node: ts.Node, depth: number = 0): number {
    let maxDepth = depth

    const visit = (n: ts.Node, currentDepth: number) => {
      let newDepth = currentDepth

      // 중첩을 증가시키는 구문들
      if (
        ts.isIfStatement(n) ||
        ts.isWhileStatement(n) ||
        ts.isDoStatement(n) ||
        ts.isForStatement(n) ||
        ts.isForInStatement(n) ||
        ts.isForOfStatement(n) ||
        ts.isTryStatement(n) ||
        ts.isSwitchStatement(n)
      ) {
        newDepth++
        maxDepth = Math.max(maxDepth, newDepth)
      }

      ts.forEachChild(n, (child) => visit(child, newDepth))
    }

    ts.forEachChild(node, (child) => visit(child, depth))
    return maxDepth
  }

  private countParameters(
    node:
      | ts.FunctionDeclaration
      | ts.MethodDeclaration
      | ts.ArrowFunction
      | ts.FunctionExpression
  ): number {
    return node.parameters.length
  }
}

function getComplexityRating(complexity: number): string {
  if (complexity <= 10) return '단순'
  if (complexity <= 20) return '보통'
  if (complexity <= 50) return '복잡'
  return '매우 복잡'
}

function analyzeFile(filePath: string): FunctionComplexity[] {
  const analyzer = new ComplexityAnalyzer()
  return analyzer.analyze(filePath)
}

function analyzeDirectory(
  dirPath: string,
  extensions: string[] = ['.ts', '.tsx', '.js', '.jsx']
): FunctionComplexity[] {
  const allFunctions: FunctionComplexity[] = []

  function walk(dir: string) {
    const files = fs.readdirSync(dir)

    for (const file of files) {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)

      if (stat.isDirectory()) {
        // node_modules, .next 등 제외
        if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
          walk(filePath)
        }
      } else if (extensions.some((ext) => file.endsWith(ext))) {
        console.log(`분석 중: ${filePath}`)
        const functions = analyzeFile(filePath)
        allFunctions.push(...functions)
      }
    }
  }

  walk(dirPath)
  return allFunctions
}

function printSummary(functions: FunctionComplexity[], threshold: number = 10): void {
  if (functions.length === 0) {
    console.log('분석할 함수가 없습니다.')
    return
  }

  // 복잡도 기준으로 정렬
  const sorted = functions.sort((a, b) => b.cyclomaticComplexity - a.cyclomaticComplexity)

  // 임계값 이상 함수만 필터링
  const complex = sorted.filter((f) => f.cyclomaticComplexity >= threshold)

  console.log('\n' + '='.repeat(100))
  console.log(`복잡도 분석 결과 (임계값: ${threshold} 이상)`)
  console.log('='.repeat(100) + '\n')

  if (complex.length === 0) {
    console.log(`✅ 모든 함수의 복잡도가 ${threshold} 미만입니다!`)
    return
  }

  console.log(`⚠️  복잡도 ${threshold} 이상 함수: ${complex.length}개\n`)

  // Top 10 출력
  console.log(
    '순위'.padEnd(6) +
      '함수명'.padEnd(35) +
      '파일:줄'.padEnd(45) +
      '복잡도'.padEnd(10) +
      '라인'.padEnd(10) +
      '중첩'
  )
  console.log('-'.repeat(100))

  complex.slice(0, 10).forEach((func, i) => {
    const fileName = path.basename(func.filePath)
    const fileLine = `${fileName}:${func.lineNumber}`

    console.log(
      `${(i + 1).toString().padEnd(6)}` +
        `${func.name.padEnd(35)}` +
        `${fileLine.padEnd(45)}` +
        `${func.cyclomaticComplexity.toString().padEnd(10)}` +
        `${func.linesOfCode.toString().padEnd(10)}` +
        `${func.maxNestingDepth}`
    )
  })

  // 통계 정보
  console.log('\n' + '='.repeat(100))
  console.log('통계 정보')
  console.log('='.repeat(100))

  const avgComplexity =
    functions.reduce((sum, f) => sum + f.cyclomaticComplexity, 0) / functions.length
  const avgLines = functions.reduce((sum, f) => sum + f.linesOfCode, 0) / functions.length
  const maxComplexity = Math.max(...functions.map((f) => f.cyclomaticComplexity))

  console.log(`총 함수 수: ${functions.length}`)
  console.log(`평균 복잡도: ${avgComplexity.toFixed(2)}`)
  console.log(`평균 라인 수: ${avgLines.toFixed(2)}`)
  console.log(`최대 복잡도: ${maxComplexity}`)

  // 복잡도 분포
  const simple = functions.filter((f) => f.cyclomaticComplexity <= 10).length
  const moderate = functions.filter(
    (f) => f.cyclomaticComplexity >= 11 && f.cyclomaticComplexity <= 20
  ).length
  const complexCount = functions.filter(
    (f) => f.cyclomaticComplexity >= 21 && f.cyclomaticComplexity <= 50
  ).length
  const veryComplex = functions.filter((f) => f.cyclomaticComplexity > 50).length

  console.log('\n복잡도 분포:')
  console.log(
    `  단순 (1-10):      ${simple.toString().padStart(4)}개 (${((simple / functions.length) * 100).toFixed(1)}%)`
  )
  console.log(
    `  보통 (11-20):     ${moderate.toString().padStart(4)}개 (${((moderate / functions.length) * 100).toFixed(1)}%)`
  )
  console.log(
    `  복잡 (21-50):     ${complexCount.toString().padStart(4)}개 (${((complexCount / functions.length) * 100).toFixed(1)}%)`
  )
  console.log(
    `  매우 복잡 (51+):  ${veryComplex.toString().padStart(4)}개 (${((veryComplex / functions.length) * 100).toFixed(1)}%)`
  )

  // 권장 사항
  console.log('\n' + '='.repeat(100))
  console.log('권장 사항')
  console.log('='.repeat(100))

  if (veryComplex > 0) {
    console.log('❌ 매우 복잡한 함수가 있습니다. 즉시 리팩토링이 필요합니다.')
  } else if (complexCount > 0) {
    console.log('⚠️  복잡한 함수가 있습니다. 리팩토링을 권장합니다.')
  } else if (moderate > functions.length * 0.3) {
    console.log('⚠️  보통 복잡도 함수가 많습니다. 점진적 개선을 권장합니다.')
  } else {
    console.log('✅ 전반적으로 양호한 복잡도입니다!')
  }
}

function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('사용법: ts-node analyze-complexity.ts <file-or-directory-path> [--threshold N]')
    process.exit(1)
  }

  const targetPath = args[0]
  let threshold = 10

  // 임계값 옵션 파싱
  const thresholdIndex = args.indexOf('--threshold')
  if (thresholdIndex !== -1 && args[thresholdIndex + 1]) {
    threshold = parseInt(args[thresholdIndex + 1], 10)
    if (isNaN(threshold)) {
      console.error('❌ 임계값은 숫자여야 합니다.')
      process.exit(1)
    }
  }

  // 경로 검증
  if (!fs.existsSync(targetPath)) {
    console.error(`❌ 경로를 찾을 수 없습니다: ${targetPath}`)
    process.exit(1)
  }

  // 분석 실행
  let functions: FunctionComplexity[] = []

  const stat = fs.statSync(targetPath)
  if (stat.isFile()) {
    if (targetPath.match(/\.(ts|tsx|js|jsx)$/)) {
      functions = analyzeFile(targetPath)
    } else {
      console.error('❌ TypeScript/JavaScript 파일만 지원합니다 (.ts, .tsx, .js, .jsx)')
      process.exit(1)
    }
  } else if (stat.isDirectory()) {
    functions = analyzeDirectory(targetPath)
  } else {
    console.error(`❌ 유효하지 않은 경로: ${targetPath}`)
    process.exit(1)
  }

  // 결과 출력
  printSummary(functions, threshold)
}

main()
