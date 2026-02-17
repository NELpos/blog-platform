import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="container-shell flex h-16 items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">Blog Platform</Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login">
              <Button size="sm">로그인</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="container-shell py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
              글쓰기와 발행을
              <br />
              한 번에 관리하는 <span className="text-primary">Tech Blog Editor</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              강력한 리치 텍스트 에디터와 깔끔한 퍼블리싱 경험을 하나로 제공합니다.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="px-8">무료로 시작하기</Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="px-8">기능 보기</Button>
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="container-shell pb-20">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-medium text-primary">Editor</p>
              <h2 className="mt-2 text-xl font-semibold">문서 중심 작성</h2>
              <p className="mt-2 text-muted-foreground">
                직관적인 툴바와 미디어 업로드로 작성 속도를 높입니다.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-medium text-primary">Publishing</p>
              <h2 className="mt-2 text-xl font-semibold">빠른 발행</h2>
              <p className="mt-2 text-muted-foreground">
                초안 저장부터 발행까지 같은 화면에서 즉시 처리할 수 있습니다.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-medium text-primary">Theme</p>
              <h2 className="mt-2 text-xl font-semibold">일관된 디자인</h2>
              <p className="mt-2 text-muted-foreground">
                라이트/다크 모드를 포함한 동일 토큰 기반 UI를 제공합니다.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
