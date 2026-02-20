# Next.js 코드 리뷰 가이드

## 목차
- 개요
- 1. Server/Client 컴포넌트 (Server & Client Components)
- 2. 데이터 페칭 (Data Fetching)
- 3. 라우팅/레이아웃 (Routing & Layouts)
- 4. 캐싱 전략 (Caching Strategies)
- 5. Server Actions
- 6. 성능 최적화 (Performance Optimization)
- 7. 미들웨어 (Middleware)
- 8. 통합 체크리스트


## 개요

**Next.js 14+ App Router** 기반 프로젝트의 코드 리뷰를 위한 가이드입니다. Tidy First와 Modern Software Engineering 원칙을 Next.js의 서버/클라이언트 아키텍처에 적용하여, 성능과 유지보수성을 동시에 확보하는 것을 목표로 합니다.

**7가지 핵심 검토 영역**:
1. **Server/Client 컴포넌트** - 렌더링 경계 최적화
2. **데이터 페칭** - 효율적인 데이터 로딩
3. **라우팅/레이아웃** - App Router 패턴 활용
4. **캐싱 전략** - 적절한 캐시 제어
5. **Server Actions** - 서버 뮤테이션 패턴
6. **성능 최적화** - 번들 크기와 로딩 속도
7. **미들웨어** - Edge Runtime 활용

---

## 1. Server/Client 컴포넌트 (Server & Client Components)

### 검토 항목

- [ ] `"use client"` 지시어가 컴포넌트 트리에서 가능한 한 아래쪽에 위치하는가?
- [ ] 서버 컴포넌트에서 데이터 패칭을 수행하는가?
- [ ] 클라이언트 컴포넌트에 불필요한 서버 전용 로직이 포함되어 있지 않은가?
- [ ] 서버에서 클라이언트로 전달하는 Props가 직렬화 가능한가? (함수, Date 객체 등 주의)
- [ ] 인터랙션이 필요 없는 컴포넌트가 `"use client"`로 표시되어 있지 않은가?

### 개선 패턴

#### 예시 1: "use client" 경계 최적화

**Before** (나쁜 예):
```tsx
// app/products/page.tsx
"use client";

import { useState } from "react";

// 전체 페이지가 클라이언트 컴포넌트 - 서버 렌더링 이점을 잃음
export default function ProductsPage() {
  const [sortBy, setSortBy] = useState("name");
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then(setProducts);
  }, [sortBy]);

  return (
    <div>
      <h1>상품 목록</h1>
      <p>총 {products.length}개의 상품이 있습니다.</p>
      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
        <option value="name">이름순</option>
        <option value="price">가격순</option>
      </select>
      <ul>
        {products.map((product) => (
          <li key={product.id}>
            <h2>{product.name}</h2>
            <p>{product.price.toLocaleString()}원</p>
            <p>{product.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**문제점**:
- 페이지 전체가 클라이언트 컴포넌트로 서버 렌더링 이점을 잃음
- 데이터를 useEffect로 패칭하여 워터폴 발생 (HTML 렌더 → JS 로드 → 데이터 패칭)
- SEO에 불리 (초기 HTML에 콘텐츠 없음)
- 번들 크기 증가

**After** (좋은 예):
```tsx
// app/products/page.tsx (서버 컴포넌트 - 기본값)
import { getProducts } from "@/lib/api/products";
import { ProductList } from "@/components/products/ProductList";
import { SortSelect } from "@/components/products/SortSelect";

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div>
      <h1>상품 목록</h1>
      <p>총 {products.length}개의 상품이 있습니다.</p>
      <SortSelect />
      <ProductList products={products} />
    </div>
  );
}
```

```tsx
// components/products/SortSelect.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// 인터랙션이 필요한 최소 단위만 클라이언트 컴포넌트로 분리
export function SortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sortBy = searchParams.get("sort") ?? "name";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams);
    params.set("sort", e.target.value);
    router.push(`?${params.toString()}`);
  }

  return (
    <select value={sortBy} onChange={handleChange}>
      <option value="name">이름순</option>
      <option value="price">가격순</option>
    </select>
  );
}
```

```tsx
// components/products/ProductList.tsx (서버 컴포넌트)
import type { Product } from "@/types/product";

interface ProductListProps {
  products: Product[];
}

export function ProductList({ products }: ProductListProps) {
  return (
    <ul>
      {products.map((product) => (
        <li key={product.id}>
          <h2>{product.name}</h2>
          <p>{product.price.toLocaleString()}원</p>
          <p>{product.description}</p>
        </li>
      ))}
    </ul>
  );
}
```

**개선 효과**:
- 서버에서 데이터를 직접 패칭하여 워터폴 제거
- `"use client"` 경계가 SortSelect 하나로 최소화됨
- ProductList는 서버 컴포넌트로 유지되어 JS 번들에 포함되지 않음
- 초기 HTML에 모든 콘텐츠가 포함되어 SEO 개선

#### 예시 2: Props를 통한 서버 → 클라이언트 데이터 전달

**Before**:
```tsx
// components/Dashboard.tsx
"use client";

import { useEffect, useState } from "react";

export function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);

  // 클라이언트에서 별도로 데이터를 다시 패칭
  useEffect(() => {
    Promise.all([fetch("/api/user"), fetch("/api/stats")])
      .then(([userRes, statsRes]) =>
        Promise.all([userRes.json(), statsRes.json()])
      )
      .then(([userData, statsData]) => {
        setUser(userData);
        setStats(statsData);
      });
  }, []);

  if (!user || !stats) return <div>로딩 중...</div>;

  return (
    <div>
      <h1>{user.name}님의 대시보드</h1>
      <InteractiveChart data={stats.chartData} />
    </div>
  );
}
```

**After**:
```tsx
// app/dashboard/page.tsx (서버 컴포넌트)
import { getUser, getStats } from "@/lib/api";
import { InteractiveChart } from "@/components/dashboard/InteractiveChart";

export default async function DashboardPage() {
  // 서버에서 병렬로 데이터 패칭
  const [user, stats] = await Promise.all([getUser(), getStats()]);

  return (
    <div>
      <h1>{user.name}님의 대시보드</h1>
      {/* 직렬화 가능한 데이터만 클라이언트 컴포넌트로 전달 */}
      <InteractiveChart data={stats.chartData} />
    </div>
  );
}
```

```tsx
// components/dashboard/InteractiveChart.tsx
"use client";

import { useState } from "react";

interface ChartProps {
  data: { label: string; value: number }[];
}

// 인터랙티브한 차트 로직만 클라이언트에서 처리
export function InteractiveChart({ data }: ChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div>
      {data.map((item, index) => (
        <div
          key={item.label}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          style={{ opacity: hoveredIndex === index ? 1 : 0.7 }}
        >
          <span>{item.label}: {item.value}</span>
        </div>
      ))}
    </div>
  );
}
```

**개선 효과**:
- 서버에서 데이터를 한 번만 패칭 (클라이언트 워터폴 제거)
- 사용자 정보 등 정적 콘텐츠는 서버 렌더링
- 클라이언트 컴포넌트는 인터랙션 로직만 담당
- 초기 로딩 시 "로딩 중..." 대신 완성된 콘텐츠 표시

---

## 2. 데이터 페칭 (Data Fetching)

### 검토 항목

- [ ] 독립적인 데이터 요청을 병렬로 처리하는가? (`Promise.all`)
- [ ] 순차 데이터 패칭(워터폴)이 불가피한 경우에만 사용하는가?
- [ ] `Suspense`를 활용하여 점진적 스트리밍을 제공하는가?
- [ ] fetch 옵션(`cache`, `next.revalidate`)을 데이터 특성에 맞게 설정하는가?
- [ ] 서버 컴포넌트에서 직접 DB/API를 호출하여 API 라우트 경유를 피하는가?

### 개선 패턴

#### 예시 1: 워터폴 방지와 병렬 패칭

**Before** (나쁜 예):
```tsx
// app/profile/page.tsx
export default async function ProfilePage({
  params,
}: {
  params: { id: string };
}) {
  // 순차 실행 - 워터폴 발생
  const user = await getUser(params.id);
  const posts = await getUserPosts(params.id);       // user 완료 후 실행
  const followers = await getFollowers(params.id);    // posts 완료 후 실행
  const recommendations = await getRecommendations(params.id); // followers 완료 후 실행

  return (
    <div>
      <UserProfile user={user} />
      <PostList posts={posts} />
      <FollowerList followers={followers} />
      <Recommendations items={recommendations} />
    </div>
  );
}
```

**문제점**:
- 4개의 독립적인 요청이 순차 실행 (각 200ms라면 총 800ms)
- 서로 의존하지 않는 데이터를 불필요하게 직렬 처리
- 페이지 전체가 모든 데이터 로딩 완료까지 대기

**After** (좋은 예):
```tsx
// app/profile/page.tsx
import { Suspense } from "react";
import { UserProfile } from "@/components/profile/UserProfile";
import { PostList } from "@/components/profile/PostList";
import { FollowerList } from "@/components/profile/FollowerList";
import { Recommendations } from "@/components/profile/Recommendations";
import { ProfileSkeleton, PostSkeleton, ListSkeleton } from "@/components/skeletons";

export default async function ProfilePage({
  params,
}: {
  params: { id: string };
}) {
  // 핵심 데이터는 병렬 패칭
  const [user, posts] = await Promise.all([
    getUser(params.id),
    getUserPosts(params.id),
  ]);

  return (
    <div>
      <UserProfile user={user} />
      <PostList posts={posts} />

      {/* 부가 데이터는 Suspense로 스트리밍 */}
      <Suspense fallback={<ListSkeleton />}>
        <FollowerSection userId={params.id} />
      </Suspense>

      <Suspense fallback={<ListSkeleton />}>
        <RecommendationSection userId={params.id} />
      </Suspense>
    </div>
  );
}

// 별도 비동기 컴포넌트로 분리하여 독립적으로 스트리밍
async function FollowerSection({ userId }: { userId: string }) {
  const followers = await getFollowers(userId);
  return <FollowerList followers={followers} />;
}

async function RecommendationSection({ userId }: { userId: string }) {
  const recommendations = await getRecommendations(userId);
  return <Recommendations items={recommendations} />;
}
```

**개선 효과**:
- 핵심 데이터(user, posts)를 병렬로 패칭하여 응답 시간 단축 (800ms → 200ms)
- 부가 데이터(followers, recommendations)는 Suspense로 점진적 스트리밍
- 사용자가 핵심 콘텐츠를 먼저 볼 수 있음
- 각 섹션이 독립적으로 로딩되어 하나의 실패가 전체에 영향 주지 않음

#### 예시 2: 서버 컴포넌트에서 직접 데이터 접근

**Before**:
```tsx
// app/articles/page.tsx - API 라우트를 불필요하게 경유
export default async function ArticlesPage() {
  // 같은 서버 내에서 API 라우트를 HTTP로 호출 (불필요한 네트워크 비용)
  const res = await fetch("http://localhost:3000/api/articles", {
    cache: "no-store",
  });
  const articles = await res.json();

  return <ArticleList articles={articles} />;
}

// app/api/articles/route.ts
export async function GET() {
  const articles = await db.article.findMany({
    orderBy: { createdAt: "desc" },
  });
  return Response.json(articles);
}
```

**After**:
```tsx
// app/articles/page.tsx - 서버 컴포넌트에서 직접 데이터 접근
import { db } from "@/lib/db";

export default async function ArticlesPage() {
  // 서버 컴포넌트에서 DB에 직접 접근 (네트워크 비용 제거)
  const articles = await db.article.findMany({
    orderBy: { createdAt: "desc" },
  });

  return <ArticleList articles={articles} />;
}

// API 라우트는 외부 클라이언트(모바일 앱 등)를 위해서만 유지
// app/api/articles/route.ts
export async function GET() {
  const articles = await db.article.findMany({
    orderBy: { createdAt: "desc" },
  });
  return Response.json(articles);
}
```

**개선 효과**:
- 동일 서버 내 불필요한 HTTP 요청 제거
- 직렬화/역직렬화 오버헤드 감소
- 타입 안전성 유지 (API 응답의 any 타입 회피)
- API 라우트는 외부 클라이언트용으로만 유지하여 관심사 분리

---

## 3. 라우팅/레이아웃 (Routing & Layouts)

### 검토 항목

- [ ] Route Group `()`을 활용하여 공통 레이아웃을 공유하는가?
- [ ] `loading.tsx`와 `error.tsx`로 적절한 로딩/에러 UI를 제공하는가?
- [ ] 동적 라우트에서 `generateStaticParams`를 활용하여 정적 생성이 가능한 경로를 사전 빌드하는가?
- [ ] `layout.tsx`에 요청마다 달라지는 데이터 패칭이 포함되어 있지 않은가?
- [ ] Parallel Routes나 Intercepting Routes를 적절히 활용하는가?

### 개선 패턴

#### 예시 1: Route Group과 Loading/Error 패턴

**Before** (나쁜 예):
```
app/
├── layout.tsx          # 모든 페이지에 사이드바 포함
├── page.tsx            # 홈 (사이드바 불필요)
├── about/page.tsx      # 소개 (사이드바 불필요)
├── dashboard/page.tsx  # 대시보드 (사이드바 필요)
├── settings/page.tsx   # 설정 (사이드바 필요)
└── profile/page.tsx    # 프로필 (사이드바 필요)
```

```tsx
// app/layout.tsx - 모든 페이지에 사이드바가 표시됨
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <Header />
        <div className="flex">
          <Sidebar />  {/* 홈, 소개 페이지에서도 불필요하게 표시 */}
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
```

**문제점**:
- 모든 페이지에 사이드바가 표시됨
- 레이아웃을 조건부로 변경하기 어려움
- 페이지 유형별 공통 UI를 분리할 수 없음

**After** (좋은 예):
```
app/
├── layout.tsx              # 루트 레이아웃 (최소 공통)
├── (marketing)/            # 마케팅 페이지 그룹
│   ├── layout.tsx          # 전체 너비 레이아웃
│   ├── page.tsx            # 홈
│   └── about/page.tsx      # 소개
├── (app)/                  # 앱 페이지 그룹
│   ├── layout.tsx          # 사이드바 레이아웃
│   ├── loading.tsx         # 공통 로딩 UI
│   ├── error.tsx           # 공통 에러 UI
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── loading.tsx     # 대시보드 전용 로딩 UI
│   ├── settings/page.tsx
│   └── profile/page.tsx
```

```tsx
// app/layout.tsx - 최소 공통 레이아웃
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}

// app/(marketing)/layout.tsx - 마케팅 전용 레이아웃
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-5xl">{children}</main>;
}

// app/(app)/layout.tsx - 앱 전용 레이아웃
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```

```tsx
// app/(app)/error.tsx - 앱 영역 공통 에러 UI
"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h2>문제가 발생했습니다</h2>
      <p>{error.message}</p>
      <button onClick={reset}>다시 시도</button>
    </div>
  );
}

// app/(app)/loading.tsx - 앱 영역 공통 로딩 UI
export default function AppLoading() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent" />
    </div>
  );
}
```

**개선 효과**:
- Route Group으로 URL 구조 변경 없이 레이아웃을 분리
- 마케팅 페이지와 앱 페이지가 각각 적절한 레이아웃 사용
- `loading.tsx`와 `error.tsx`로 일관된 UX 제공
- 중첩 loading으로 섹션별 로딩 UI 커스터마이징 가능

#### 예시 2: 동적 라우트 최적화

**Before**:
```tsx
// app/blog/[slug]/page.tsx
export default async function BlogPost({
  params,
}: {
  params: { slug: string };
}) {
  // 모든 요청에서 서버 렌더링 (매번 DB 조회)
  const post = await getPost(params.slug);

  if (!post) notFound();

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
```

**After**:
```tsx
// app/blog/[slug]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// 빌드 시 정적 경로를 사전 생성
export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

// 동적 메타데이터 생성
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
  };
}

export default async function BlogPost({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPost(params.slug);

  if (!post) notFound();

  return (
    <article>
      <h1>{post.title}</h1>
      <time dateTime={post.publishedAt}>
        {new Date(post.publishedAt).toLocaleDateString("ko-KR")}
      </time>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
```

```tsx
// app/blog/[slug]/not-found.tsx
export default function PostNotFound() {
  return (
    <div className="text-center py-20">
      <h2>게시글을 찾을 수 없습니다</h2>
      <p>요청하신 게시글이 존재하지 않거나 삭제되었습니다.</p>
    </div>
  );
}
```

**개선 효과**:
- `generateStaticParams`로 빌드 시 사전 생성하여 응답 속도 향상
- `generateMetadata`로 SEO 최적화
- `not-found.tsx`로 404 페이지 커스터마이징
- 블로그처럼 변경이 적은 콘텐츠에 적합한 정적 생성 활용

---

## 4. 캐싱 전략 (Caching Strategies)

### 검토 항목

- [ ] 데이터 특성에 따라 적절한 캐싱 전략을 사용하는가? (`force-cache`, `no-store`, `revalidate`)
- [ ] 태그 기반 캐시 무효화(`revalidateTag`)를 사용하여 세밀한 제어를 하는가?
- [ ] 정적 콘텐츠와 동적 콘텐츠의 캐시 전략이 구분되어 있는가?
- [ ] 사용자별 데이터에 `force-cache`를 사용하고 있지 않은가?
- [ ] `unstable_cache` 또는 `React.cache`를 활용하여 요청 중복을 제거하는가?

### 개선 패턴

#### 예시 1: 데이터 특성별 캐싱

**Before** (나쁜 예):
```tsx
// 모든 데이터에 동일한 캐시 전략 적용
export default async function StorePage() {
  // 카테고리 목록 - 거의 변하지 않지만 매번 새로 패칭
  const categories = await fetch("https://api.store.com/categories", {
    cache: "no-store",
  }).then((r) => r.json());

  // 상품 목록 - 자주 변하지만 캐시 없음
  const products = await fetch("https://api.store.com/products", {
    cache: "no-store",
  }).then((r) => r.json());

  // 실시간 재고 - 실시간이어야 하지만 동일 처리
  const inventory = await fetch("https://api.store.com/inventory", {
    cache: "no-store",
  }).then((r) => r.json());

  return (
    <div>
      <CategoryNav categories={categories} />
      <ProductGrid products={products} />
      <InventoryStatus inventory={inventory} />
    </div>
  );
}
```

**문제점**:
- 모든 데이터에 `no-store`를 적용하여 캐싱 이점을 전혀 활용하지 못함
- 카테고리처럼 거의 변하지 않는 데이터도 매번 패칭
- 불필요한 서버 부하 및 응답 지연

**After** (좋은 예):
```tsx
// lib/api/store.ts - 데이터 특성별 캐싱 전략 분리
export async function getCategories() {
  // 카테고리: 거의 변하지 않으므로 24시간 캐시
  const res = await fetch("https://api.store.com/categories", {
    next: { revalidate: 86400, tags: ["categories"] },
  });
  return res.json();
}

export async function getProducts() {
  // 상품 목록: 주기적 업데이트이므로 5분 캐시
  const res = await fetch("https://api.store.com/products", {
    next: { revalidate: 300, tags: ["products"] },
  });
  return res.json();
}

export async function getInventory() {
  // 재고 현황: 실시간 데이터이므로 캐시 없음
  const res = await fetch("https://api.store.com/inventory", {
    cache: "no-store",
  });
  return res.json();
}
```

```tsx
// app/store/page.tsx
import { Suspense } from "react";
import { getCategories, getProducts } from "@/lib/api/store";

export default async function StorePage() {
  // 캐시된 데이터는 빠르게 로드
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts(),
  ]);

  return (
    <div>
      <CategoryNav categories={categories} />
      <ProductGrid products={products} />

      {/* 실시간 데이터만 Suspense로 스트리밍 */}
      <Suspense fallback={<InventorySkeleton />}>
        <InventorySection />
      </Suspense>
    </div>
  );
}

async function InventorySection() {
  const { getInventory } = await import("@/lib/api/store");
  const inventory = await getInventory();
  return <InventoryStatus inventory={inventory} />;
}
```

**개선 효과**:
- 데이터 특성에 맞는 캐시 전략으로 응답 속도 최적화
- 태그 기반 무효화로 세밀한 캐시 제어 가능
- 실시간 데이터만 Suspense로 분리하여 핵심 콘텐츠 즉시 표시
- 서버 부하 감소 (카테고리 요청이 24시간에 1회로 줄어듦)

#### 예시 2: 태그 기반 캐시 무효화

**Before**:
```tsx
// app/admin/products/actions.ts
"use server";

import { revalidatePath } from "next/cache";

export async function updateProduct(id: string, data: ProductData) {
  await db.product.update({ where: { id }, data });

  // 경로 기반 재검증 - 영향 범위를 정확히 알기 어려움
  revalidatePath("/store");
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  revalidatePath("/admin/products");
  // 관련 페이지를 모두 나열해야 함...
}
```

**After**:
```tsx
// app/admin/products/actions.ts
"use server";

import { revalidateTag } from "next/cache";

export async function updateProduct(id: string, data: ProductData) {
  await db.product.update({ where: { id }, data });

  // 태그 기반 재검증 - 해당 태그를 사용하는 모든 fetch가 자동 무효화
  revalidateTag("products");
  revalidateTag(`product-${id}`);
}
```

```tsx
// lib/api/products.ts - fetch 시 태그 설정
export async function getProducts() {
  const res = await fetch("https://api.store.com/products", {
    next: { tags: ["products"] },
  });
  return res.json();
}

export async function getProduct(id: string) {
  const res = await fetch(`https://api.store.com/products/${id}`, {
    next: { tags: ["products", `product-${id}`] },
  });
  return res.json();
}
```

**개선 효과**:
- 태그 기반으로 관련 캐시를 정확하게 무효화
- 새로운 페이지가 추가되어도 태그만 맞으면 자동으로 무효화됨
- `revalidatePath`를 나열하는 유지보수 부담 제거
- 캐시 무효화의 의도가 명확히 표현됨

---

## 5. Server Actions

### 검토 항목

- [ ] Server Action에서 입력 값을 검증하는가? (zod, valibot 등)
- [ ] `"use server"`가 파일 최상단 또는 함수 내부에 올바르게 위치하는가?
- [ ] Progressive Enhancement를 지원하는가? (JS 비활성 시에도 동작)
- [ ] 에러 처리가 사용자에게 적절한 피드백을 제공하는가?
- [ ] Server Action이 적절한 권한 검사를 수행하는가?

### 개선 패턴

#### 예시 1: 입력 검증과 에러 처리

**Before** (나쁜 예):
```tsx
// app/contact/actions.ts
"use server";

export async function submitContact(formData: FormData) {
  // 입력 검증 없음 - 보안 위험
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const message = formData.get("message") as string;

  // SQL 인젝션, XSS 등에 취약
  await db.contact.create({
    data: { name, email, message },
  });

  // 에러 처리 없음 - 실패 시 사용자에게 피드백 없음
}
```

```tsx
// app/contact/page.tsx
"use client";

import { submitContact } from "./actions";

export default function ContactPage() {
  return (
    <form action={submitContact}>
      <input name="name" />
      <input name="email" />
      <textarea name="message" />
      <button type="submit">보내기</button>
    </form>
  );
}
```

**문제점**:
- 서버 사이드 입력 검증 없음 (클라이언트 검증만으로는 불충분)
- 에러 발생 시 사용자에게 피드백 없음
- 성공/실패 상태를 구분할 수 없음
- 중복 제출 방지 없음

**After** (좋은 예):
```tsx
// app/contact/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

// 입력 스키마 정의
const contactSchema = z.object({
  name: z
    .string()
    .min(2, "이름은 2자 이상이어야 합니다")
    .max(50, "이름은 50자 이하여야 합니다"),
  email: z
    .string()
    .email("올바른 이메일 주소를 입력해주세요"),
  message: z
    .string()
    .min(10, "메시지는 10자 이상이어야 합니다")
    .max(1000, "메시지는 1000자 이하여야 합니다"),
});

// 타입 안전한 응답 정의
type ActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function submitContact(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // 서버 사이드 입력 검증
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "입력 값을 확인해주세요",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await db.contact.create({ data: parsed.data });
    revalidatePath("/contact");

    return {
      success: true,
      message: "문의가 성공적으로 접수되었습니다",
    };
  } catch (error) {
    return {
      success: false,
      message: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}
```

```tsx
// app/contact/page.tsx
"use client";

import { useActionState } from "react";
import { submitContact } from "./actions";

const initialState = { success: false, message: "", errors: {} };

export default function ContactPage() {
  const [state, formAction, isPending] = useActionState(
    submitContact,
    initialState
  );

  return (
    <form action={formAction}>
      <div>
        <label htmlFor="name">이름</label>
        <input id="name" name="name" required minLength={2} maxLength={50} />
        {state.errors?.name && (
          <p className="text-red-500">{state.errors.name[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="email">이메일</label>
        <input id="email" name="email" type="email" required />
        {state.errors?.email && (
          <p className="text-red-500">{state.errors.email[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="message">메시지</label>
        <textarea id="message" name="message" required minLength={10} maxLength={1000} />
        {state.errors?.message && (
          <p className="text-red-500">{state.errors.message[0]}</p>
        )}
      </div>

      <button type="submit" disabled={isPending}>
        {isPending ? "전송 중..." : "보내기"}
      </button>

      {state.message && (
        <p className={state.success ? "text-green-500" : "text-red-500"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
```

**개선 효과**:
- zod 스키마로 서버 사이드 입력 검증 (보안 강화)
- `useActionState`로 성공/실패 상태를 UI에 반영
- 필드별 에러 메시지 표시
- `isPending`으로 중복 제출 방지 및 로딩 상태 표시
- HTML `required`, `minLength` 속성으로 Progressive Enhancement 지원

#### 예시 2: 권한 검사와 낙관적 업데이트

**Before**:
```tsx
// app/posts/actions.ts
"use server";

export async function deletePost(postId: string) {
  // 권한 검사 없음 - 누구나 삭제 가능
  await db.post.delete({ where: { id: postId } });
}
```

**After**:
```tsx
// app/posts/actions.ts
"use server";

import { auth } from "@/lib/auth";
import { revalidateTag } from "next/cache";

export async function deletePost(postId: string) {
  // 인증 확인
  const session = await auth();
  if (!session?.user) {
    throw new Error("로그인이 필요합니다");
  }

  // 권한 확인 - 작성자 본인만 삭제 가능
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });

  if (!post) {
    throw new Error("게시글을 찾을 수 없습니다");
  }

  if (post.authorId !== session.user.id) {
    throw new Error("삭제 권한이 없습니다");
  }

  await db.post.delete({ where: { id: postId } });
  revalidateTag("posts");
}
```

```tsx
// components/posts/DeleteButton.tsx
"use client";

import { useOptimistic, useTransition } from "react";
import { deletePost } from "@/app/posts/actions";

interface DeleteButtonProps {
  postId: string;
  onDelete?: () => void;
}

export function DeleteButton({ postId, onDelete }: DeleteButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    startTransition(async () => {
      try {
        await deletePost(postId);
        onDelete?.();
      } catch (error) {
        alert(error instanceof Error ? error.message : "삭제에 실패했습니다");
      }
    });
  }

  return (
    <button onClick={handleDelete} disabled={isPending}>
      {isPending ? "삭제 중..." : "삭제"}
    </button>
  );
}
```

**개선 효과**:
- 인증 및 권한 검사로 보안 강화
- 작성자 본인만 삭제 가능하도록 제한
- 에러 메시지를 사용자에게 명확히 전달
- `useTransition`으로 비동기 작업 중 로딩 상태 관리

---

## 6. 성능 최적화 (Performance Optimization)

### 검토 항목

- [ ] `next/image`를 사용하여 이미지를 최적화하는가?
- [ ] `next/font`를 사용하여 폰트 최적화와 FOUT/FOIT를 방지하는가?
- [ ] 무거운 라이브러리를 `next/dynamic`으로 지연 로딩하는가?
- [ ] Metadata API를 활용하여 SEO를 최적화하는가?
- [ ] 불필요한 클라이언트 사이드 JavaScript가 번들에 포함되지 않는가?

### 개선 패턴

#### 예시 1: 이미지와 폰트 최적화

**Before** (나쁜 예):
```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        {/* 외부 폰트 로드 - FOUT 발생, 성능 저하 */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

// components/ProductCard.tsx
export function ProductCard({ product }) {
  return (
    <div>
      {/* 최적화 없는 img 태그 */}
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>{product.price.toLocaleString()}원</p>
    </div>
  );
}
```

**문제점**:
- 외부 CSS 로드로 렌더링 차단 및 FOUT(Flash of Unstyled Text) 발생
- `<img>` 태그는 이미지 크기 최적화, 레이지 로딩, WebP 변환 없음
- CLS(Cumulative Layout Shift) 발생 가능 (이미지 크기 미지정)

**After** (좋은 예):
```tsx
// app/layout.tsx
import { Noto_Sans_KR } from "next/font/google";

// next/font로 빌드 시 폰트를 셀프 호스팅
const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-noto-sans-kr",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={notoSansKR.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

```tsx
// components/ProductCard.tsx
import Image from "next/image";

interface ProductCardProps {
  product: {
    name: string;
    image: string;
    price: number;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <div>
      {/* next/image로 자동 최적화 */}
      <Image
        src={product.image}
        alt={product.name}
        width={400}
        height={300}
        className="object-cover rounded-lg"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQ..."
      />
      <h3>{product.name}</h3>
      <p>{product.price.toLocaleString()}원</p>
    </div>
  );
}
```

**개선 효과**:
- `next/font`로 폰트를 빌드 시 셀프 호스팅하여 외부 요청 제거
- FOUT/FOIT 방지 및 폰트 로드 성능 개선
- `next/image`로 WebP 자동 변환, 레이지 로딩, 반응형 사이즈 적용
- `width`/`height` 지정 및 `placeholder="blur"`로 CLS 방지
- `sizes` 속성으로 뷰포트에 맞는 이미지 크기 전달

#### 예시 2: Dynamic Import와 Metadata API

**Before**:
```tsx
// app/editor/page.tsx
"use client";

// 무거운 에디터 라이브러리가 초기 번들에 포함됨
import { Editor } from "@monaco-editor/react";
import { Chart } from "chart.js";
import ReactMarkdown from "react-markdown";

export default function EditorPage() {
  const [tab, setTab] = useState("editor");

  return (
    <div>
      <nav>
        <button onClick={() => setTab("editor")}>에디터</button>
        <button onClick={() => setTab("preview")}>미리보기</button>
        <button onClick={() => setTab("chart")}>차트</button>
      </nav>

      {tab === "editor" && <Editor height="500px" language="typescript" />}
      {tab === "preview" && <ReactMarkdown>{content}</ReactMarkdown>}
      {tab === "chart" && <Chart type="bar" data={chartData} />}
    </div>
  );
}
```

**문제점**:
- Monaco Editor, Chart.js 등 무거운 라이브러리가 모두 초기 번들에 포함
- 사용자가 해당 탭을 열지 않아도 모든 라이브러리가 로드됨
- 초기 페이지 로딩 시간 증가

**After**:
```tsx
// app/editor/page.tsx
import type { Metadata } from "next";

// Metadata API로 SEO 최적화
export const metadata: Metadata = {
  title: "코드 에디터 | Learn TDD",
  description: "TypeScript 코드를 작성하고 미리보기를 확인하세요",
  openGraph: {
    title: "코드 에디터",
    description: "인터랙티브 TypeScript 코드 에디터",
  },
};

// 서버 컴포넌트에서 클라이언트 컴포넌트로 위임
export default function EditorPage() {
  return <EditorClient />;
}
```

```tsx
// components/editor/EditorClient.tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// Dynamic import로 지연 로딩 - 필요할 때만 다운로드
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.Editor),
  {
    loading: () => <div className="h-[500px] animate-pulse bg-gray-800 rounded" />,
    ssr: false, // 서버 사이드 렌더링 비활성화 (window 의존)
  }
);

const MarkdownPreview = dynamic(
  () => import("react-markdown"),
  {
    loading: () => <div className="animate-pulse h-64 bg-gray-800 rounded" />,
  }
);

const ChartView = dynamic(
  () => import("@/components/editor/ChartView"),
  {
    loading: () => <div className="animate-pulse h-64 bg-gray-800 rounded" />,
  }
);

export default function EditorClient() {
  const [tab, setTab] = useState<"editor" | "preview" | "chart">("editor");
  const [content, setContent] = useState("");

  return (
    <div>
      <nav className="flex gap-2 mb-4">
        <button onClick={() => setTab("editor")}>에디터</button>
        <button onClick={() => setTab("preview")}>미리보기</button>
        <button onClick={() => setTab("chart")}>차트</button>
      </nav>

      {/* 선택된 탭의 컴포넌트만 지연 로딩 */}
      {tab === "editor" && (
        <MonacoEditor
          height="500px"
          language="typescript"
          value={content}
          onChange={(value) => setContent(value ?? "")}
        />
      )}
      {tab === "preview" && <MarkdownPreview>{content}</MarkdownPreview>}
      {tab === "chart" && <ChartView />}
    </div>
  );
}
```

**개선 효과**:
- `next/dynamic`으로 무거운 라이브러리를 지연 로딩 (초기 번들 크기 대폭 감소)
- 각 탭 전환 시에만 해당 라이브러리 다운로드
- `loading` 콜백으로 로딩 중 스켈레톤 UI 표시
- `ssr: false`로 window 의존 라이브러리의 서버 사이드 오류 방지
- Metadata API로 페이지별 SEO 최적화

---

## 7. 미들웨어 (Middleware)

### 검토 항목

- [ ] 미들웨어가 Edge Runtime에서 실행 가능한 코드만 포함하는가?
- [ ] `matcher` 설정으로 불필요한 경로에서의 실행을 방지하는가?
- [ ] 미들웨어 내부에서 무거운 연산이나 외부 API 호출을 피하는가?
- [ ] 인증/인가 로직이 미들웨어에서 적절히 처리되는가?
- [ ] 미들웨어의 응답 시간이 전체 요청에 미치는 영향을 고려하는가?

### 개선 패턴

#### 예시 1: 인증/인가 패턴

**Before** (나쁜 예):
```tsx
// middleware.ts
import { NextRequest, NextResponse } from "next/server";

// 모든 요청에서 실행됨 (정적 파일 포함)
export default async function middleware(request: NextRequest) {
  // 무거운 DB 조회를 미들웨어에서 수행
  const session = await fetch("https://api.auth.com/verify", {
    headers: { cookie: request.headers.get("cookie") ?? "" },
  }).then((r) => r.json());

  if (!session.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 복잡한 권한 검사도 미들웨어에서 수행
  const userPermissions = await fetch(
    `https://api.auth.com/permissions/${session.user.id}`
  ).then((r) => r.json());

  if (
    request.nextUrl.pathname.startsWith("/admin") &&
    !userPermissions.includes("admin")
  ) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

// matcher 설정 없음 - 모든 경로에서 실행
```

**문제점**:
- `matcher`가 없어 정적 파일(`_next/static`, 이미지 등)에도 실행됨
- 매 요청마다 2번의 외부 API 호출 (성능 병목)
- Edge Runtime에서 무거운 연산 수행
- 단순 인증 확인에 과도한 로직 포함

**After** (좋은 예):
```tsx
// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/edge";

// 보호할 경로만 지정
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/settings/:path*",
    "/api/((?!auth|public).*)",
  ],
};

export default async function middleware(request: NextRequest) {
  const token = request.cookies.get("session-token")?.value;

  // 토큰이 없으면 로그인 페이지로 리다이렉트
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Edge 호환 JWT 검증 (외부 API 호출 없이 로컬 검증)
  const payload = await verifyToken(token);

  if (!payload) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 관리자 경로 접근 제어 (토큰에 포함된 role로 판단)
  if (request.nextUrl.pathname.startsWith("/admin") && payload.role !== "admin") {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  // 요청 헤더에 사용자 정보 추가 (서버 컴포넌트에서 활용)
  const headers = new Headers(request.headers);
  headers.set("x-user-id", payload.userId);
  headers.set("x-user-role", payload.role);

  return NextResponse.next({ request: { headers } });
}
```

```tsx
// lib/auth/edge.ts - Edge Runtime 호환 인증 유틸리티
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: string; role: string };
  } catch {
    return null;
  }
}
```

**개선 효과**:
- `matcher`로 보호 경로만 지정하여 불필요한 실행 방지
- JWT 로컬 검증으로 외부 API 호출 제거 (응답 시간 대폭 감소)
- `callbackUrl`로 로그인 후 원래 페이지로 복귀
- 요청 헤더로 사용자 정보를 전달하여 서버 컴포넌트에서 재조회 방지
- Edge Runtime 호환 라이브러리(`jose`) 사용

#### 예시 2: 국제화(i18n) 리다이렉트

**Before**:
```tsx
// middleware.ts
export default function middleware(request: NextRequest) {
  // 간단한 언어 감지를 복잡하게 구현
  const acceptLanguage = request.headers.get("accept-language");
  let locale = "ko";

  if (acceptLanguage) {
    const languages = acceptLanguage.split(",");
    for (const lang of languages) {
      const code = lang.split(";")[0].trim().substring(0, 2);
      if (["ko", "en", "ja"].includes(code)) {
        locale = code;
        break;
      }
    }
  }

  // 모든 요청에서 리다이렉트 (무한 루프 위험)
  if (!request.nextUrl.pathname.startsWith(`/${locale}`)) {
    return NextResponse.redirect(
      new URL(`/${locale}${request.nextUrl.pathname}`, request.url)
    );
  }
}
```

**After**:
```tsx
// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

const locales = ["ko", "en", "ja"] as const;
const defaultLocale = "ko";

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|images|fonts).*)"],
};

function getLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale && locales.includes(cookieLocale as any)) {
    return cookieLocale;
  }

  const headers = { "accept-language": request.headers.get("accept-language") ?? "" };
  const languages = new Negotiator({ headers }).languages();

  try {
    return matchLocale(languages, locales, defaultLocale);
  } catch {
    return defaultLocale;
  }
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 이미 로케일이 포함된 경로인지 확인
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return NextResponse.next();

  // 로케일 감지 및 리다이렉트
  const locale = getLocale(request);
  const newUrl = new URL(`/${locale}${pathname}`, request.url);

  return NextResponse.redirect(newUrl);
}
```

**개선 효과**:
- `matcher`로 정적 파일 제외
- 쿠키 우선 확인으로 사용자 선택 존중
- 표준 라이브러리(`@formatjs/intl-localematcher`)로 정확한 언어 매칭
- 이미 로케일이 포함된 경로에서는 리다이렉트하지 않음 (무한 루프 방지)

---

## 8. 통합 체크리스트

코드 리뷰 시 다음 항목을 우선순위별로 검토합니다:

| 카테고리 | 검토 항목 | 우선순위 |
|----------|----------|----------|
| **Server/Client** | `"use client"` 경계가 컴포넌트 트리 아래쪽에 위치하는가? | **High** |
| **Server/Client** | 서버 컴포넌트에서 데이터를 패칭하는가? | **High** |
| **Server/Client** | 클라이언트 컴포넌트로 전달되는 Props가 직렬화 가능한가? | **High** |
| **데이터 페칭** | 독립적인 요청을 병렬로 처리하는가? (`Promise.all`) | **High** |
| **데이터 페칭** | 불필요한 API 라우트 경유 없이 서버에서 직접 데이터에 접근하는가? | **High** |
| **데이터 페칭** | `Suspense`를 활용하여 점진적 스트리밍을 제공하는가? | **Medium** |
| **라우팅** | Route Group으로 공통 레이아웃을 분리하는가? | **Medium** |
| **라우팅** | `loading.tsx`와 `error.tsx`로 적절한 UI를 제공하는가? | **Medium** |
| **라우팅** | `generateStaticParams`로 정적 경로를 사전 생성하는가? | **Medium** |
| **캐싱** | 데이터 특성에 따른 적절한 캐싱 전략을 사용하는가? | **High** |
| **캐싱** | `revalidateTag`로 세밀한 캐시 무효화를 수행하는가? | **Medium** |
| **캐싱** | 사용자별 데이터에 `force-cache`를 사용하지 않는가? | **High** |
| **Server Actions** | 서버 사이드 입력 검증을 수행하는가? (zod 등) | **High** |
| **Server Actions** | 적절한 인증/인가 검사를 수행하는가? | **High** |
| **Server Actions** | 에러 처리와 사용자 피드백을 제공하는가? | **Medium** |
| **Server Actions** | Progressive Enhancement를 지원하는가? | **Low** |
| **성능** | `next/image`로 이미지를 최적화하는가? | **High** |
| **성능** | `next/font`로 폰트를 셀프 호스팅하는가? | **Medium** |
| **성능** | 무거운 라이브러리를 `next/dynamic`으로 지연 로딩하는가? | **Medium** |
| **성능** | Metadata API로 SEO를 최적화하는가? | **Medium** |
| **미들웨어** | `matcher` 설정으로 실행 범위를 제한하는가? | **High** |
| **미들웨어** | Edge Runtime 호환 코드만 사용하는가? | **High** |
| **미들웨어** | 무거운 외부 API 호출을 피하는가? | **Medium** |

### 우선순위별 요약

#### High Priority (즉시 수정)
- [ ] 페이지 전체가 `"use client"`로 표시됨
- [ ] 클라이언트에서 useEffect로 데이터 패칭 (서버 컴포넌트 사용 가능한데도)
- [ ] Server Action에 입력 검증 없음
- [ ] Server Action에 인증/인가 검사 없음
- [ ] 사용자별 데이터에 `force-cache` 적용
- [ ] 미들웨어에 `matcher` 설정 없음
- [ ] 독립적 데이터 요청의 순차 실행 (워터폴)
- [ ] `<img>` 태그 직접 사용 (`next/image` 미활용)

#### Medium Priority (다음 리팩토링)
- [ ] Suspense 미활용 (긴 로딩 대기)
- [ ] Route Group 미활용 (레이아웃 분리 미흡)
- [ ] `loading.tsx` / `error.tsx` 미제공
- [ ] 캐시 무효화에 `revalidatePath`만 사용 (태그 미활용)
- [ ] 폰트 외부 CDN 로딩 (`next/font` 미활용)
- [ ] Dynamic Import 미활용 (큰 번들 크기)
- [ ] Metadata API 미활용

#### Low Priority (시간 여유 시)
- [ ] Progressive Enhancement 미지원
- [ ] `generateStaticParams` 미활용 (정적 가능한 동적 라우트)
- [ ] `not-found.tsx` 미제공 (기본 404 사용)
- [ ] 이미지 `sizes` 속성 미지정
- [ ] `placeholder="blur"` 미적용

---

### Before/After 제공 가이드

모든 리뷰 제안은 다음 형식으로 제공합니다:

```markdown
**Before** (문제점):
[현재 코드]

**문제점**:
- 구체적인 문제 설명 (성능, 보안, 유지보수성 등)

**After** (개선안):
[개선된 코드]

**개선 효과**:
- 구체적인 수치 또는 정성적 개선 효과
```

### App Router 전환 체크리스트

Pages Router에서 App Router로 전환 시 추가로 확인해야 할 사항:

| 변경 사항 | Pages Router | App Router |
|-----------|-------------|------------|
| 데이터 패칭 | `getServerSideProps` / `getStaticProps` | 서버 컴포넌트에서 직접 `async/await` |
| 레이아웃 | `_app.tsx` / `_document.tsx` | `layout.tsx` (중첩 레이아웃) |
| 에러 처리 | `_error.tsx` | `error.tsx` (경로별 에러 경계) |
| 로딩 | 수동 구현 | `loading.tsx` (자동 Suspense) |
| API 뮤테이션 | API Routes + fetch | Server Actions |
| 메타데이터 | `next/head` | Metadata API (`generateMetadata`) |

---

**이 가이드를 활용하여 Next.js App Router 프로젝트의 체계적인 코드 리뷰를 수행하세요!**
