# React 코드 리뷰 가이드

## 목차
- 개요
- 1. 컴포넌트 패턴 (Component Patterns)
- 2. Hooks 규칙 (Hooks Rules)
- 3. 상태 관리 (State Management)
- 4. 렌더링 최적화 (Rendering Optimization)
- 5. 이벤트 처리 (Event Handling)
- 6. 접근성 (Accessibility - a11y)
- 7. 통합 체크리스트
- Before/After 제공 가이드


## 개요

**React 코드 리뷰 가이드**는 React 19+ 프로젝트에서 Tidy First 원칙과 Modern Software Engineering 원칙을 적용한 체계적인 코드 리뷰를 위한 문서입니다. 컴포넌트 설계, Hooks 활용, 상태 관리, 렌더링 최적화, 이벤트 처리, 접근성까지 6가지 핵심 영역을 다룹니다.

**6가지 핵심 영역**:
1. **Component Patterns** - 컴포넌트 크기 제한, 단일 책임, 합성(Composition) 우선
2. **Hooks Rules** - useEffect 의존성, 커스텀 Hook 추출, 메모이제이션 전략
3. **State Management** - 파생 상태, 상태 위치, 서버/클라이언트 상태 분리
4. **Rendering Optimization** - key prop, 인라인 객체 주의, 구조적 최적화
5. **Event Handling** - Controlled/Uncontrolled, 디바운스/쓰로틀, 폼 처리
6. **Accessibility** - 시맨틱 HTML, ARIA, 키보드 네비게이션

---

## 1. 컴포넌트 패턴 (Component Patterns)

### 검토 항목

1. 컴포넌트가 200줄을 초과하는가?
2. 하나의 컴포넌트가 여러 관심사를 동시에 처리하는가?
3. 상속(Inheritance) 대신 합성(Composition)을 사용하고 있는가?
4. 컴포넌트명만으로 역할을 유추할 수 있는가?
5. Props가 5개 이상인가? (Props Drilling 또는 과도한 책임 신호)
6. 컴포넌트가 비즈니스 로직과 UI 렌더링을 동시에 담당하는가?
7. 재사용 가능한 UI 요소가 특정 도메인에 결합되어 있는가?

### 개선 패턴

#### 예시 1: 컴포넌트 크기 제한과 단일 책임 원칙

**Before** (나쁜 예):
```tsx
// 300줄이 넘는 거대한 컴포넌트 - 여러 책임이 혼재
function UserDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchAll() {
      setIsLoading(true);
      const userData = await fetch('/api/user').then(r => r.json());
      const orderData = await fetch('/api/orders').then(r => r.json());
      const notifData = await fetch('/api/notifications').then(r => r.json());
      setUser(userData);
      setOrders(orderData);
      setNotifications(notifData);
      setIsLoading(false);
    }
    fetchAll();
  }, []);

  const filteredOrders = orders.filter(
    order => order.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (isLoading) return <div>로딩 중...</div>;

  return (
    <div>
      <header>
        <h1>{user?.name}님의 대시보드</h1>
        <span>읽지 않은 알림: {unreadCount}</span>
      </header>
      <nav>
        <button onClick={() => setActiveTab('profile')}>프로필</button>
        <button onClick={() => setActiveTab('orders')}>주문 내역</button>
        <button onClick={() => setActiveTab('notifications')}>알림</button>
      </nav>
      {activeTab === 'profile' && (
        <div>
          <h2>프로필 정보</h2>
          <p>이름: {user?.name}</p>
          <p>이메일: {user?.email}</p>
          <p>가입일: {user?.createdAt}</p>
          {/* ... 프로필 수정 폼, 비밀번호 변경 등 100줄 이상 */}
        </div>
      )}
      {activeTab === 'orders' && (
        <div>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="주문 검색..."
          />
          <ul>
            {filteredOrders.map(order => (
              <li key={order.id}>
                <span>{order.name}</span>
                <span>{order.totalAmount.toLocaleString()}원</span>
                <span>{order.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {activeTab === 'notifications' && (
        <div>
          {notifications.map(notif => (
            <div key={notif.id} style={{ fontWeight: notif.isRead ? 'normal' : 'bold' }}>
              <p>{notif.message}</p>
              <span>{notif.createdAt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**문제점**:
- 하나의 컴포넌트가 데이터 페칭, 탭 관리, 검색, 프로필, 주문, 알림을 모두 처리
- 300줄 이상으로 가독성 저하
- 개별 기능 테스트 불가능
- 부분 변경 시 전체 컴포넌트에 영향

**After** (좋은 예):
```tsx
// 최상위 컴포넌트 - 합성과 라우팅만 담당
function UserDashboard() {
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'notifications'>('profile');

  return (
    <div>
      <DashboardHeader />
      <DashboardNav activeTab={activeTab} onTabChange={setActiveTab} />
      <DashboardContent activeTab={activeTab} />
    </div>
  );
}

// 탭별 컨텐츠 렌더링만 담당
function DashboardContent({ activeTab }: { activeTab: string }) {
  switch (activeTab) {
    case 'profile':
      return <UserProfile />;
    case 'orders':
      return <OrderHistory />;
    case 'notifications':
      return <NotificationList />;
    default:
      return null;
  }
}

// 각 탭은 독립적인 컴포넌트
function UserProfile() {
  const { data: user, isLoading } = useUser();

  if (isLoading) return <LoadingSpinner />;
  if (!user) return <EmptyState message="사용자 정보를 불러올 수 없습니다" />;

  return (
    <section>
      <h2>프로필 정보</h2>
      <ProfileInfo user={user} />
      <ProfileEditForm user={user} />
    </section>
  );
}

function OrderHistory() {
  const { data: orders, isLoading } = useOrders();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = useMemo(
    () => orders?.filter(
      order => order.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? [],
    [orders, searchQuery]
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <section>
      <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="주문 검색..." />
      <OrderList orders={filteredOrders} />
    </section>
  );
}
```

**개선 효과**:
- 각 컴포넌트가 단일 책임을 가짐 (SRP)
- 개별 컴포넌트를 독립적으로 테스트 가능
- 컴포넌트별 200줄 이하로 가독성 향상
- 데이터 페칭 로직이 커스텀 Hook으로 분리되어 재사용 가능

#### 예시 2: Composition 패턴

**Before** (나쁜 예):
```tsx
// Props로 모든 변형을 제어하는 거대한 컴포넌트
function Card({
  title,
  subtitle,
  image,
  imagePosition,
  actions,
  footer,
  variant,
  isCollapsible,
  isCollapsed,
  onToggle,
  badge,
  badgeColor,
  headerExtra,
}: CardProps) {
  return (
    <div className={`card card--${variant}`}>
      {image && imagePosition === 'top' && <img src={image} />}
      <div className="card-header">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
        {badge && <span style={{ color: badgeColor }}>{badge}</span>}
        {headerExtra}
        {isCollapsible && (
          <button onClick={onToggle}>{isCollapsed ? '펼치기' : '접기'}</button>
        )}
      </div>
      {image && imagePosition === 'middle' && <img src={image} />}
      {(!isCollapsible || !isCollapsed) && <div className="card-body">{/* ... */}</div>}
      {footer && <div className="card-footer">{footer}</div>}
      {actions && <div className="card-actions">{actions}</div>}
    </div>
  );
}
```

**After** (좋은 예):
```tsx
// Compound Component 패턴으로 합성 가능한 구조
function Card({ children, variant = 'default' }: CardProps) {
  return <div className={`card card--${variant}`}>{children}</div>;
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="card-header">{children}</div>;
}

function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="card-body">{children}</div>;
}

function CardFooter({ children }: { children: React.ReactNode }) {
  return <div className="card-footer">{children}</div>;
}

// 사용 예시 - 조합이 자유로움
function ProductCard({ product }: { product: Product }) {
  return (
    <Card variant="elevated">
      <CardHeader>
        <h3>{product.name}</h3>
        <Badge color="green">신상품</Badge>
      </CardHeader>
      <CardBody>
        <img src={product.image} alt={product.name} />
        <p>{product.description}</p>
      </CardBody>
      <CardFooter>
        <span>{product.price.toLocaleString()}원</span>
        <Button>장바구니 담기</Button>
      </CardFooter>
    </Card>
  );
}
```

**개선 효과**:
- Props 개수가 대폭 감소하여 인터페이스가 단순해짐
- 사용처에서 자유롭게 조합 가능 (유연성 향상)
- 각 서브 컴포넌트를 독립적으로 테스트 가능
- 새로운 변형 추가 시 기존 코드 수정 불필요 (OCP)

### 적용 가이드

**컴포넌트 분리 신호**:
1. 컴포넌트가 200줄을 초과한다 -> 관심사별로 분리
2. Props가 5개를 초과한다 -> Compound Component 또는 합성 패턴 적용
3. 조건부 렌더링이 3개 이상이다 -> 각 분기를 별도 컴포넌트로 추출
4. `useEffect`가 3개 이상이다 -> 커스텀 Hook으로 추출

**분리 기준**:
- UI 렌더링과 비즈니스 로직을 분리
- 재사용 가능한 UI는 `components/ui/`에 배치
- 도메인 특화 컴포넌트는 기능별 폴더에 배치

---

## 2. Hooks 규칙 (Hooks Rules)

### 검토 항목

1. useEffect의 의존성 배열이 올바르게 선언되어 있는가?
2. useEffect 내에서 클린업 함수가 필요한 경우 빠져있지 않은가?
3. 반복되는 상태 로직이 커스텀 Hook으로 추출되어 있는가?
4. useMemo/useCallback이 실제 성능 이점이 있는 곳에만 사용되는가?
5. useRef와 useState의 선택이 적절한가? (렌더링 트리거 여부 기준)
6. useEffect가 동기화(synchronization) 목적으로만 사용되는가?
7. useEffect 안에서 상태 업데이트가 무한 루프를 유발하지 않는가?

### 개선 패턴

#### 예시 1: useEffect 의존성 배열 관리

**Before** (나쁜 예):
```tsx
function UserSearch({ onResults }: { onResults: (users: User[]) => void }) {
  const [query, setQuery] = useState('');

  // 문제 1: 의존성 배열에 onResults 누락 -> stale closure
  // 문제 2: 디바운스 없이 매 키입력마다 API 호출
  // 문제 3: 클린업 없이 비동기 작업 수행 -> 경쟁 상태(race condition) 가능
  useEffect(() => {
    fetch(`/api/users?q=${query}`)
      .then(r => r.json())
      .then(data => onResults(data));
  }, [query]); // eslint-disable-next-line 으로 경고 무시하면 안 됨

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

**After** (좋은 예):
```tsx
function UserSearch({ onResults }: { onResults: (users: User[]) => void }) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery) {
      onResults([]);
      return;
    }

    // AbortController로 경쟁 상태 방지
    const controller = new AbortController();

    fetch(`/api/users?q=${debouncedQuery}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => onResults(data))
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error('검색 실패:', err);
        }
      });

    // 클린업: 컴포넌트 언마운트 또는 다음 effect 실행 전에 이전 요청 취소
    return () => controller.abort();
  }, [debouncedQuery, onResults]);

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}

// 재사용 가능한 디바운스 Hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

**개선 효과**:
- 의존성 배열이 완전하여 stale closure 문제 해소
- AbortController로 경쟁 상태(race condition) 방지
- 디바운스로 불필요한 API 호출 감소
- 클린업 함수로 메모리 누수 방지

#### 예시 2: 커스텀 Hook 추출 시점

**Before** (나쁜 예):
```tsx
function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(`/api/products?page=${page}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled) {
          setProducts(prev => [...prev, ...data.items]);
          setHasMore(data.hasMore);
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message);
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [page]);

  // 이 로직이 ReviewList, CommentList 등에서도 반복됨
  return (
    <div>
      {products.map(p => <ProductCard key={p.id} product={p} />)}
      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      {hasMore && <button onClick={() => setPage(p => p + 1)}>더 보기</button>}
    </div>
  );
}
```

**After** (좋은 예):
```tsx
// 페이지네이션 로직을 커스텀 Hook으로 추출
function usePaginatedFetch<T>(url: string) {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(`${url}?page=${page}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        setItems(prev => [...prev, ...data.items]);
        setHasMore(data.hasMore);
        setIsLoading(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(err.message);
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [url, page]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      setPage(p => p + 1);
    }
  };

  const reset = () => {
    setItems([]);
    setPage(1);
    setHasMore(true);
  };

  return { items, isLoading, error, hasMore, loadMore, reset };
}

// 사용 - 컴포넌트는 UI 렌더링에만 집중
function ProductList() {
  const { items, isLoading, error, hasMore, loadMore } = usePaginatedFetch<Product>('/api/products');

  return (
    <div>
      {items.map(p => <ProductCard key={p.id} product={p} />)}
      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      {hasMore && <button onClick={loadMore}>더 보기</button>}
    </div>
  );
}

// 다른 컴포넌트에서도 재사용
function ReviewList() {
  const { items, isLoading, error, hasMore, loadMore } = usePaginatedFetch<Review>('/api/reviews');
  // ...
}
```

**개선 효과**:
- 반복되는 페이지네이션 로직을 한 곳에서 관리
- 컴포넌트가 UI 렌더링에만 집중 (관심사 분리)
- 커스텀 Hook을 독립적으로 테스트 가능
- 새로운 목록 컴포넌트 추가 시 로직 재사용

#### 예시 3: useMemo/useCallback 적절한 사용

**Before** (나쁜 예):
```tsx
function SimpleGreeting({ name }: { name: string }) {
  // 불필요한 메모이제이션 - 단순 문자열 연결에 useMemo 사용
  const greeting = useMemo(() => `안녕하세요, ${name}님!`, [name]);

  // 불필요한 useCallback - 자식에게 전달하지 않는 간단한 핸들러
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);

  // 불필요한 useMemo - 원시값 비교는 이미 빠름
  const isLongName = useMemo(() => name.length > 10, [name]);

  return (
    <div>
      <p>{greeting}</p>
      <p>{isLongName ? '긴 이름이네요' : '짧은 이름이네요'}</p>
      <button onClick={handleClick}>클릭</button>
    </div>
  );
}
```

**After** (좋은 예):
```tsx
function SimpleGreeting({ name }: { name: string }) {
  // 단순 계산은 메모이제이션 불필요 - 직접 계산
  const greeting = `안녕하세요, ${name}님!`;
  const isLongName = name.length > 10;

  const handleClick = () => {
    console.log('clicked');
  };

  return (
    <div>
      <p>{greeting}</p>
      <p>{isLongName ? '긴 이름이네요' : '짧은 이름이네요'}</p>
      <button onClick={handleClick}>클릭</button>
    </div>
  );
}

// useMemo가 적절한 경우: 비용이 큰 계산 + 자주 리렌더링되는 컴포넌트
function DataTable({ rows, sortKey, filterText }: DataTableProps) {
  // 수천 개의 행을 정렬하고 필터링하는 비용이 큰 계산
  const processedRows = useMemo(() => {
    const filtered = rows.filter(row =>
      row.name.toLowerCase().includes(filterText.toLowerCase())
    );
    return filtered.sort((a, b) => a[sortKey].localeCompare(b[sortKey]));
  }, [rows, sortKey, filterText]);

  // React.memo로 감싼 자식에 전달하는 콜백 -> useCallback 적절
  const handleRowClick = useCallback((rowId: string) => {
    console.log('선택된 행:', rowId);
  }, []);

  return (
    <div>
      {processedRows.map(row => (
        <MemoizedRow key={row.id} row={row} onClick={handleRowClick} />
      ))}
    </div>
  );
}

const MemoizedRow = memo(function DataRow({ row, onClick }: DataRowProps) {
  return (
    <tr onClick={() => onClick(row.id)}>
      <td>{row.name}</td>
      <td>{row.value}</td>
    </tr>
  );
});
```

**개선 효과**:
- 불필요한 메모이제이션 제거로 코드 단순화
- 실제 성능 이점이 있는 곳에만 메모이제이션 적용
- React.memo와 useCallback을 함께 사용하여 의미 있는 최적화 달성
- 코드의 의도가 명확해짐 (메모이제이션 = 성능 최적화 의도)

#### 예시 4: useRef vs useState 선택

**Before** (나쁜 예):
```tsx
function StopWatch() {
  // 타이머 ID는 렌더링에 사용되지 않는데 useState로 관리 -> 불필요한 리렌더링 유발
  const [timerId, setTimerId] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const start = () => {
    const id = window.setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    setTimerId(id); // 불필요한 리렌더링 발생
  };

  const stop = () => {
    if (timerId) {
      clearInterval(timerId);
      setTimerId(null); // 불필요한 리렌더링 발생
    }
  };

  return (
    <div>
      <p>{elapsed}초</p>
      <button onClick={start}>시작</button>
      <button onClick={stop}>정지</button>
    </div>
  );
}
```

**After** (좋은 예):
```tsx
function StopWatch() {
  // 타이머 ID는 UI에 표시되지 않으므로 useRef 사용 -> 리렌더링 없음
  const timerIdRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const start = () => {
    timerIdRef.current = window.setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
  };

  const stop = () => {
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
  };

  // 클린업: 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
      }
    };
  }, []);

  return (
    <div>
      <p>{elapsed}초</p>
      <button onClick={start}>시작</button>
      <button onClick={stop}>정지</button>
    </div>
  );
}
```

**개선 효과**:
- 렌더링에 영향을 주지 않는 값은 useRef로 관리하여 불필요한 리렌더링 방지
- 타이머 ID 변경 시 리렌더링이 발생하지 않아 성능 향상
- 컴포넌트 언마운트 시 타이머 정리로 메모리 누수 방지

### 적용 가이드

**Hook 선택 기준**:

| 상황 | 추천 Hook | 이유 |
|------|-----------|------|
| UI에 표시되는 값 | useState | 값 변경 시 리렌더링 필요 |
| UI에 표시되지 않는 값 | useRef | 리렌더링 불필요 |
| DOM 요소 참조 | useRef | DOM 접근용 |
| 비용이 큰 계산 | useMemo | 불필요한 재계산 방지 |
| memo된 자식에 전달하는 함수 | useCallback | 자식 리렌더링 방지 |
| 외부 시스템 동기화 | useEffect | 사이드 이펙트 처리 |

**useEffect 사용 주의사항**:
- useEffect는 외부 시스템과의 동기화 목적으로만 사용
- 이벤트 핸들러로 처리할 수 있으면 useEffect를 사용하지 않음
- eslint-disable로 의존성 경고를 무시하지 않음
- 클린업 함수를 반드시 고려

---

## 3. 상태 관리 (State Management)

### 검토 항목

1. 다른 상태로부터 계산 가능한 값을 별도 상태로 관리하고 있는가? (파생 상태)
2. 상태가 필요 이상으로 높은 레벨에 위치하는가? (불필요한 Prop Drilling)
3. 서버 상태와 클라이언트 UI 상태가 혼재되어 있는가?
4. 복잡한 상태 전이를 useState로 관리하고 있는가? (useReducer 후보)
5. 상태 업데이트가 여러 useState 호출로 분산되어 있는가?
6. 전역 상태에 로컬 상태가 포함되어 있는가?

### 개선 패턴

#### 예시 1: 파생 상태 제거

**Before** (나쁜 예):
```tsx
function ShoppingCart({ items }: { items: CartItem[] }) {
  const [totalPrice, setTotalPrice] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [hasDiscount, setHasDiscount] = useState(false);

  // 파생 가능한 값을 useEffect로 동기화 -> 불필요한 상태 + 리렌더링
  useEffect(() => {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    setTotalPrice(total);
    setItemCount(items.reduce((sum, item) => sum + item.quantity, 0));
    setHasDiscount(total > 50000);
  }, [items]);

  return (
    <div>
      <p>상품 수: {itemCount}개</p>
      <p>합계: {totalPrice.toLocaleString()}원</p>
      {hasDiscount && <p>할인 적용 가능!</p>}
    </div>
  );
}
```

**After** (좋은 예):
```tsx
function ShoppingCart({ items }: { items: CartItem[] }) {
  // 파생 상태는 렌더링 중에 직접 계산
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const hasDiscount = totalPrice > 50000;

  return (
    <div>
      <p>상품 수: {itemCount}개</p>
      <p>합계: {totalPrice.toLocaleString()}원</p>
      {hasDiscount && <p>할인 적용 가능!</p>}
    </div>
  );
}
```

**개선 효과**:
- 불필요한 상태 3개 제거 (useState 3개 -> 0개)
- useEffect 제거로 동기화 버그 가능성 제거
- 불필요한 추가 리렌더링 방지 (useEffect -> setState는 2번 렌더링)
- 코드가 단순해져 가독성 향상

#### 예시 2: 상태 위치 결정

**Before** (나쁜 예):
```tsx
// 전역 상태에 로컬 UI 상태가 혼재
// store.ts
interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  // 아래는 모달 하나에서만 쓰이는 로컬 상태
  isModalOpen: boolean;
  modalSearchQuery: string;
  modalSelectedItems: string[];
  modalCurrentStep: number;
}

// 모달 내부에서만 쓰이는 상태를 전역으로 관리 -> 불필요한 전역 오염
function ItemSelectorModal() {
  const isOpen = useStore(state => state.isModalOpen);
  const searchQuery = useStore(state => state.modalSearchQuery);
  const selectedItems = useStore(state => state.modalSelectedItems);
  const currentStep = useStore(state => state.modalCurrentStep);
  // ...
}
```

**After** (좋은 예):
```tsx
// 전역 상태는 진정한 전역 관심사만 포함
// store.ts
interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
}

// 모달의 로컬 상태는 컴포넌트 내부에서 관리
function ItemSelectorModal({ isOpen, onClose }: ModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedItems([]);
      setCurrentStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <StepIndicator current={currentStep} total={3} />
      {currentStep === 0 && (
        <SearchStep query={searchQuery} onQueryChange={setSearchQuery} />
      )}
      {currentStep === 1 && (
        <SelectionStep items={selectedItems} onItemsChange={setSelectedItems} />
      )}
      {currentStep === 2 && (
        <ConfirmStep items={selectedItems} />
      )}
    </Dialog>
  );
}
```

**개선 효과**:
- 전역 상태가 깨끗해짐 (진정한 전역 관심사만 포함)
- 모달의 상태가 모달과 함께 생성/소멸 (생명주기 일치)
- 다른 컴포넌트가 모달 상태 변경에 영향받지 않음
- 모달을 독립적으로 테스트 가능

#### 예시 3: useReducer 활용

**Before** (나쁜 예):
```tsx
function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // 여러 상태를 동시에 업데이트해야 하는 복잡한 전이
  const goNext = () => {
    const stepErrors = validateStep(currentStep, formData);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setCurrentStep(prev => prev + 1);
  };

  const goBack = () => {
    setErrors({});
    setCurrentStep(prev => prev - 1);
  };

  const submit = async () => {
    setIsSubmitting(true);
    setErrors({});
    try {
      await api.submitForm(formData);
      setIsComplete(true);
      setIsSubmitting(false);
    } catch (err) {
      setErrors({ submit: err.message });
      setIsSubmitting(false);
    }
  };
  // ...
}
```

**After** (좋은 예):
```tsx
type FormState = {
  currentStep: number;
  formData: Record<string, unknown>;
  errors: Record<string, string>;
  status: 'idle' | 'submitting' | 'complete' | 'error';
};

type FormAction =
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_FIELD'; field: string; value: unknown }
  | { type: 'SET_ERRORS'; errors: Record<string, string> }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; error: string };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'NEXT_STEP':
      return { ...state, currentStep: state.currentStep + 1, errors: {} };
    case 'PREV_STEP':
      return { ...state, currentStep: state.currentStep - 1, errors: {} };
    case 'SET_FIELD':
      return { ...state, formData: { ...state.formData, [action.field]: action.value } };
    case 'SET_ERRORS':
      return { ...state, errors: action.errors };
    case 'SUBMIT_START':
      return { ...state, status: 'submitting', errors: {} };
    case 'SUBMIT_SUCCESS':
      return { ...state, status: 'complete' };
    case 'SUBMIT_ERROR':
      return { ...state, status: 'error', errors: { submit: action.error } };
    default:
      return state;
  }
}

function MultiStepForm() {
  const [state, dispatch] = useReducer(formReducer, {
    currentStep: 0,
    formData: {},
    errors: {},
    status: 'idle',
  });

  const goNext = () => {
    const stepErrors = validateStep(state.currentStep, state.formData);
    if (Object.keys(stepErrors).length > 0) {
      dispatch({ type: 'SET_ERRORS', errors: stepErrors });
      return;
    }
    dispatch({ type: 'NEXT_STEP' });
  };

  const submit = async () => {
    dispatch({ type: 'SUBMIT_START' });
    try {
      await api.submitForm(state.formData);
      dispatch({ type: 'SUBMIT_SUCCESS' });
    } catch (err) {
      dispatch({ type: 'SUBMIT_ERROR', error: err.message });
    }
  };
  // ...
}
```

**개선 효과**:
- 상태 전이가 명시적으로 정의됨 (action type으로 추적 가능)
- 관련 상태가 하나의 객체로 응집됨
- reducer를 독립적으로 단위 테스트 가능
- 잘못된 상태 조합이 발생할 수 없음 (예: submitting + complete 동시 불가)

### 적용 가이드

**상태 위치 결정 기준**:

| 상태 유형 | 위치 | 예시 |
|-----------|------|------|
| 단일 컴포넌트 UI 상태 | 컴포넌트 useState | 토글, 입력값, 드롭다운 열림 상태 |
| 형제 컴포넌트 간 공유 | 가장 가까운 공통 부모 | 탭 선택 상태, 필터 조건 |
| 페이지 전체 공유 | 페이지 레벨 상태 | 현재 선택된 아이템, 모드 |
| 앱 전역 | 전역 상태 (Zustand) | 로그인 사용자, 테마, 언어 |
| 서버 데이터 | 서버 상태 관리 라이브러리 | API 응답 데이터, 캐시 |

**useState vs useReducer 선택 기준**:
- useState: 독립적인 단순 상태 1-2개
- useReducer: 관련된 상태 3개 이상, 복잡한 상태 전이, 상태 업데이트 로직 테스트 필요

---

## 4. 렌더링 최적화 (Rendering Optimization)

### 검토 항목

1. 리스트 렌더링에서 key로 배열 인덱스를 사용하고 있는가?
2. 렌더링 함수 내에서 인라인 객체/배열 리터럴을 생성하여 자식에 전달하는가?
3. React.memo가 실제 리렌더링 문제가 있는 곳에 적용되어 있는가?
4. 부모 상태 변경이 불필요하게 모든 자식을 리렌더링하는가?
5. 무거운 컴포넌트를 렌더링할 때 lazy loading을 고려했는가?
6. children prop을 활용하여 리렌더링 범위를 줄이고 있는가?

### 개선 패턴

#### 예시 1: key prop 올바른 사용

**Before** (나쁜 예):
```tsx
function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <ul>
      {/* 인덱스를 key로 사용 -> 항목 추가/삭제/재정렬 시 버그 발생 */}
      {todos.map((todo, index) => (
        <TodoItem key={index} todo={todo} />
      ))}
    </ul>
  );
}

// 문제 상황: 첫 번째 항목을 삭제하면
// index 0이 두 번째 항목을 가리키게 되어
// React가 DOM을 올바르게 업데이트하지 못함
// -> 입력 필드의 값이 잘못된 항목에 남아있는 버그 발생
```

**After** (좋은 예):
```tsx
function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <ul>
      {/* 고유한 ID를 key로 사용 -> 항목의 변경을 정확히 추적 */}
      {todos.map(todo => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}

// 고유 ID가 없는 경우에도 인덱스보다 나은 대안:
// - crypto.randomUUID()로 생성 시점에 ID 부여
// - 데이터의 고유한 조합으로 key 생성 (예: `${item.name}-${item.date}`)
```

**개선 효과**:
- 항목 추가/삭제/재정렬 시 올바른 DOM 업데이트 보장
- 입력 필드, 포커스, 애니메이션 등의 상태가 올바른 항목에 유지
- React의 재조정(reconciliation) 알고리즘이 효율적으로 동작

#### 예시 2: 인라인 객체/함수 리터럴 주의

**Before** (나쁜 예):
```tsx
function ParentComponent({ theme }: { theme: string }) {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>카운트: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>증가</button>

      {/* 매 렌더링마다 새 객체 생성 -> ExpensiveChild가 항상 리렌더링 */}
      <ExpensiveChild
        style={{ color: theme === 'dark' ? 'white' : 'black', fontSize: 16 }}
        config={{ showHeader: true, animationDuration: 300 }}
        onItemClick={(id: string) => console.log('clicked', id)}
      />
    </div>
  );
}

const ExpensiveChild = memo(function ExpensiveChild({ style, config, onItemClick }: Props) {
  // memo를 사용했지만 매번 새 객체/함수가 전달되므로 무용지물
  return <div style={style}>{/* 무거운 렌더링 */}</div>;
});
```

**After** (좋은 예):
```tsx
function ParentComponent({ theme }: { theme: string }) {
  const [count, setCount] = useState(0);

  // 객체를 useMemo로 안정화
  const style = useMemo(
    () => ({ color: theme === 'dark' ? 'white' : 'black', fontSize: 16 }),
    [theme]
  );

  // 변경되지 않는 설정은 컴포넌트 외부에 상수로 정의
  const config = EXPENSIVE_CHILD_CONFIG;

  // 콜백을 useCallback으로 안정화
  const handleItemClick = useCallback((id: string) => {
    console.log('clicked', id);
  }, []);

  return (
    <div>
      <p>카운트: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>증가</button>

      {/* count 변경 시 ExpensiveChild는 리렌더링되지 않음 */}
      <ExpensiveChild style={style} config={config} onItemClick={handleItemClick} />
    </div>
  );
}

// 정적 설정은 컴포넌트 바깥에 선언
const EXPENSIVE_CHILD_CONFIG = { showHeader: true, animationDuration: 300 };

const ExpensiveChild = memo(function ExpensiveChild({ style, config, onItemClick }: Props) {
  return <div style={style}>{/* 무거운 렌더링 */}</div>;
});
```

**개선 효과**:
- count 변경 시 ExpensiveChild가 리렌더링되지 않음
- React.memo가 실제로 효과를 발휘함
- 정적 설정은 모듈 레벨로 추출하여 메모이제이션 비용 없음

#### 예시 3: 컴포넌트 구조로 리렌더링 최소화

**Before** (나쁜 예):
```tsx
function App() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // 마우스 이동 시 전체 트리가 리렌더링됨
  return (
    <div onMouseMove={e => setMousePosition({ x: e.clientX, y: e.clientY })}>
      <p>마우스: {mousePosition.x}, {mousePosition.y}</p>
      <ExpensiveTree />       {/* 마우스 이동마다 불필요하게 리렌더링 */}
      <AnotherExpensiveTree /> {/* 마우스 이동마다 불필요하게 리렌더링 */}
    </div>
  );
}
```

**After** (좋은 예):
```tsx
// 방법 1: 상태를 사용하는 부분만 별도 컴포넌트로 분리
function App() {
  return (
    <div>
      <MouseTracker />
      <ExpensiveTree />       {/* App이 리렌더링되지 않으므로 영향 없음 */}
      <AnotherExpensiveTree /> {/* App이 리렌더링되지 않으므로 영향 없음 */}
    </div>
  );
}

function MouseTracker() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  return (
    <div onMouseMove={e => setMousePosition({ x: e.clientX, y: e.clientY })}>
      <p>마우스: {mousePosition.x}, {mousePosition.y}</p>
    </div>
  );
}

// 방법 2: children 패턴으로 리렌더링 범위 제한
function MouseTrackerWrapper({ children }: { children: React.ReactNode }) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  return (
    <div onMouseMove={e => setMousePosition({ x: e.clientX, y: e.clientY })}>
      <p>마우스: {mousePosition.x}, {mousePosition.y}</p>
      {children} {/* children은 부모의 상태 변경에 영향받지 않음 */}
    </div>
  );
}

function App() {
  return (
    <MouseTrackerWrapper>
      <ExpensiveTree />
      <AnotherExpensiveTree />
    </MouseTrackerWrapper>
  );
}
```

**개선 효과**:
- 마우스 이동 시 무거운 컴포넌트가 리렌더링되지 않음
- React.memo 없이 컴포넌트 구조만으로 최적화 달성
- children 패턴은 이미 생성된 React 엘리먼트이므로 부모 리렌더링에 영향받지 않음
- 코드의 의도가 명확하고 유지보수가 쉬움

### 적용 가이드

**렌더링 최적화 우선순위**:
1. **구조 변경 (가장 우선)**: 상태를 사용하는 곳으로 컴포넌트 분리, children 패턴
2. **React.memo**: 자주 리렌더링되는 무거운 컴포넌트에 적용
3. **useMemo/useCallback**: React.memo와 함께 사용할 때만 효과적
4. **lazy loading**: 초기 로딩 시 불필요한 컴포넌트 지연 로드

**최적화하지 말아야 할 때**:
- 성능 문제가 측정되지 않은 상태에서 최적화하지 않음
- 단순한 컴포넌트에 React.memo를 적용하지 않음 (비교 비용 > 렌더링 비용)
- Profiler로 실제 병목을 확인한 후에 최적화

---

## 5. 이벤트 처리 (Event Handling)

### 검토 항목

1. 폼 입력에서 Controlled와 Uncontrolled 방식의 선택이 적절한가?
2. 빈번한 이벤트(스크롤, 리사이즈, 타이핑)에 디바운스/쓰로틀을 적용했는가?
3. 폼 제출 시 유효성 검사가 적절히 처리되는가?
4. 이벤트 핸들러 내에서 불필요한 상태 업데이트가 발생하는가?
5. React 19의 useActionState나 form action 패턴을 활용하고 있는가?

### 개선 패턴

#### 예시 1: Controlled vs Uncontrolled

**Before** (나쁜 예):
```tsx
// 모든 필드를 Controlled로 관리 -> 매 키입력마다 리렌더링
function RegistrationForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  // 7개의 필드 각각이 키입력마다 전체 폼을 리렌더링

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    api.register({ name, email, password, confirmPassword, address, phone, bio });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={e => setName(e.target.value)} />
      <input value={email} onChange={e => setEmail(e.target.value)} />
      <input value={password} onChange={e => setPassword(e.target.value)} />
      <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
      <input value={address} onChange={e => setAddress(e.target.value)} />
      <input value={phone} onChange={e => setPhone(e.target.value)} />
      <textarea value={bio} onChange={e => setBio(e.target.value)} />
      <button type="submit">가입</button>
    </form>
  );
}
```

**After** (좋은 예):
```tsx
// 방법 1: 제출 시에만 값이 필요한 경우 -> Uncontrolled + FormData
function RegistrationForm() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
      bio: formData.get('bio') as string,
    };
    api.register(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" required />
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <input name="address" />
      <input name="phone" type="tel" />
      <textarea name="bio" />
      <button type="submit">가입</button>
    </form>
  );
}

// 방법 2: React 19 form action 패턴
function RegistrationForm() {
  const [state, formAction, isPending] = useActionState(
    async (prevState: FormState, formData: FormData) => {
      const result = await api.register({
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        password: formData.get('password') as string,
      });

      if (!result.success) {
        return { errors: result.errors };
      }
      return { success: true };
    },
    { errors: {} }
  );

  return (
    <form action={formAction}>
      <input name="name" required />
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      {state.errors?.email && <p className="error">{state.errors.email}</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? '가입 중...' : '가입'}
      </button>
    </form>
  );
}
```

**개선 효과**:
- 불필요한 상태 7개 제거 -> useState 0개
- 키입력마다 리렌더링이 발생하지 않음
- FormData API로 간결한 데이터 수집
- React 19의 useActionState로 로딩/에러 상태 자동 관리

#### 예시 2: 디바운스/쓰로틀 패턴

**Before** (나쁜 예):
```tsx
function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  // 매 키입력마다 API 호출 -> 서버 부하 + 성능 문제
  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    const data = await fetch(`/api/search?q=${value}`).then(r => r.json());
    setResults(data);
  };

  return (
    <div>
      <input value={query} onChange={handleSearch} />
      {results.map(r => <SearchResultCard key={r.id} result={r} />)}
    </div>
  );
}
```

**After** (좋은 예):
```tsx
function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      return;
    }

    const controller = new AbortController();

    fetch(`/api/search?q=${debouncedQuery}`, { signal: controller.signal })
      .then(r => r.json())
      .then(setResults)
      .catch(err => {
        if (err.name !== 'AbortError') console.error(err);
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      {results.map(r => <SearchResultCard key={r.id} result={r} />)}
    </div>
  );
}

// 스크롤 이벤트에는 쓰로틀 사용
function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdated = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdated.current >= interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - (now - lastUpdated.current));
      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
}
```

**개선 효과**:
- 디바운스로 API 호출 빈도 대폭 감소 (예: 초당 10회 -> 1회)
- AbortController로 중복 요청 취소
- 스크롤 이벤트에 쓰로틀 적용으로 UI 렉 방지
- 사용자 경험 향상 (입력 중 깜빡임 감소)

#### 예시 3: 폼 유효성 검사 패턴

**Before** (나쁜 예):
```tsx
function ContactForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [messageError, setMessageError] = useState('');

  const handleSubmit = () => {
    let hasError = false;

    // 수동으로 각 필드 검증 -> 반복적이고 실수하기 쉬움
    if (!email) {
      setEmailError('이메일을 입력하세요');
      hasError = true;
    } else if (!email.includes('@')) {
      setEmailError('올바른 이메일 형식이 아닙니다');
      hasError = true;
    } else {
      setEmailError('');
    }

    if (!message) {
      setMessageError('메시지를 입력하세요');
      hasError = true;
    } else if (message.length < 10) {
      setMessageError('10자 이상 입력하세요');
      hasError = true;
    } else {
      setMessageError('');
    }

    if (!hasError) {
      api.sendContact({ email, message });
    }
  };

  return (
    <form>
      <input value={email} onChange={e => setEmail(e.target.value)} />
      {emailError && <p className="error">{emailError}</p>}
      <textarea value={message} onChange={e => setMessage(e.target.value)} />
      {messageError && <p className="error">{messageError}</p>}
      <button type="button" onClick={handleSubmit}>보내기</button>
    </form>
  );
}
```

**After** (좋은 예):
```tsx
// 검증 로직을 순수 함수로 분리
type ValidationRule<T> = {
  validate: (value: T) => boolean;
  message: string;
};

function useFormValidation<T extends Record<string, unknown>>(
  values: T,
  rules: Record<keyof T, ValidationRule<any>[]>
) {
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const validateField = (field: keyof T) => {
    const fieldRules = rules[field] ?? [];
    for (const rule of fieldRules) {
      if (!rule.validate(values[field])) {
        return rule.message;
      }
    }
    return '';
  };

  const validateAll = (): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    for (const field of Object.keys(rules) as (keyof T)[]) {
      const error = validateField(field);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    }
    setErrors(newErrors);
    return isValid;
  };

  const handleBlur = (field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  return { errors, touched, validateAll, handleBlur };
}

function ContactForm() {
  const [formData, setFormData] = useState({ email: '', message: '' });

  const { errors, touched, validateAll, handleBlur } = useFormValidation(formData, {
    email: [
      { validate: (v: string) => v.length > 0, message: '이메일을 입력하세요' },
      { validate: (v: string) => v.includes('@'), message: '올바른 이메일 형식이 아닙니다' },
    ],
    message: [
      { validate: (v: string) => v.length > 0, message: '메시지를 입력하세요' },
      { validate: (v: string) => v.length >= 10, message: '10자 이상 입력하세요' },
    ],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateAll()) {
      api.sendContact(formData);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.email}
        onChange={e => updateField('email', e.target.value)}
        onBlur={() => handleBlur('email')}
      />
      {touched.email && errors.email && <p className="error">{errors.email}</p>}
      <textarea
        value={formData.message}
        onChange={e => updateField('message', e.target.value)}
        onBlur={() => handleBlur('message')}
      />
      {touched.message && errors.message && <p className="error">{errors.message}</p>}
      <button type="submit">보내기</button>
    </form>
  );
}
```

**개선 효과**:
- 검증 규칙이 선언적으로 정의되어 추가/수정이 쉬움
- 검증 로직을 커스텀 Hook으로 분리하여 재사용 가능
- touched 상태로 사용자 경험 향상 (blur 시에만 에러 표시)
- 검증 규칙을 독립적으로 단위 테스트 가능

### 적용 가이드

**Controlled vs Uncontrolled 선택 기준**:

| 상황 | 방식 | 이유 |
|------|------|------|
| 실시간 유효성 검사 필요 | Controlled | 값 변경을 즉시 추적 |
| 제출 시에만 값 필요 | Uncontrolled + FormData | 불필요한 리렌더링 방지 |
| 서버 액션과 연동 | React 19 form action | 내장 로딩/에러 상태 활용 |
| 입력값 포맷팅 (전화번호 등) | Controlled | 실시간 포맷 변환 |
| 복잡한 폼 (수십 개 필드) | Uncontrolled + 라이브러리 | 성능 최적화 |

**디바운스 vs 쓰로틀**:
- 디바운스: 마지막 입력 후 일정 시간 대기 (검색, 자동완성)
- 쓰로틀: 일정 간격마다 실행 (스크롤, 리사이즈, 마우스 이동)

---

## 6. 접근성 (Accessibility - a11y)

### 검토 항목

1. 클릭 가능한 요소에 `<button>` 또는 `<a>` 대신 `<div onClick>`을 사용하고 있는가?
2. 이미지에 alt 속성이 적절히 설정되어 있는가?
3. 폼 요소에 label이 연결되어 있는가?
4. ARIA 속성이 시맨틱 HTML로 대체 가능한 곳에 불필요하게 사용되는가?
5. 키보드만으로 모든 기능을 사용할 수 있는가?
6. 동적 콘텐츠 변경이 스크린 리더에 알려지는가? (aria-live)
7. 색상 대비가 WCAG 기준을 충족하는가?

### 개선 패턴

#### 예시 1: 시맨틱 HTML 사용

**Before** (나쁜 예):
```tsx
function Navigation() {
  return (
    // div 남용 -> 스크린 리더가 구조를 파악할 수 없음
    <div className="nav">
      <div className="nav-logo" onClick={() => navigate('/')}>
        로고
      </div>
      <div className="nav-links">
        <div className="nav-link" onClick={() => navigate('/about')}>
          소개
        </div>
        <div className="nav-link" onClick={() => navigate('/products')}>
          제품
        </div>
        <div className="nav-link" onClick={() => navigate('/contact')}>
          문의
        </div>
      </div>
      <div className="search-box">
        <div className="input-wrapper">
          <input type="text" placeholder="검색..." />
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="card" onClick={() => navigate(`/products/${product.id}`)}>
      <img src={product.image} />  {/* alt 속성 없음 */}
      <div className="title">{product.name}</div>
      <div className="price" style={{ color: 'red' }}>{product.price}원</div>
      <div className="button" onClick={addToCart}>장바구니</div>  {/* div를 버튼으로 사용 */}
    </div>
  );
}
```

**After** (좋은 예):
```tsx
function Navigation() {
  return (
    // 시맨틱 HTML 사용 -> 스크린 리더가 네비게이션 구조를 파악 가능
    <nav aria-label="메인 내비게이션">
      <a href="/" aria-label="홈으로 이동">
        로고
      </a>
      <ul role="list">
        <li><a href="/about">소개</a></li>
        <li><a href="/products">제품</a></li>
        <li><a href="/contact">문의</a></li>
      </ul>
      <search>
        <form role="search" action="/search">
          <label htmlFor="nav-search" className="sr-only">검색</label>
          <input id="nav-search" type="search" name="q" placeholder="검색..." />
        </form>
      </search>
    </nav>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <article className="card">
      <a href={`/products/${product.id}`}>
        <img src={product.image} alt={`${product.name} 상품 이미지`} />
        <h3>{product.name}</h3>
      </a>
      <p className="price">
        <span className="sr-only">가격:</span>
        {product.price.toLocaleString()}원
      </p>
      <button
        type="button"
        onClick={() => addToCart(product.id)}
        aria-label={`${product.name} 장바구니에 담기`}
      >
        장바구니
      </button>
    </article>
  );
}
```

**개선 효과**:
- 스크린 리더가 페이지 구조를 정확히 파악 가능 (nav, article, h3 등)
- 키보드 사용자가 Tab 키로 자연스럽게 탐색 가능 (a, button은 기본 focusable)
- 이미지에 적절한 대체 텍스트 제공
- 시각적으로 숨긴 텍스트(sr-only)로 추가 컨텍스트 제공

#### 예시 2: 키보드 네비게이션과 ARIA

**Before** (나쁜 예):
```tsx
function Dropdown({ options, onSelect }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState('');

  return (
    // 키보드 접근 불가 -> Tab, Enter, Escape 미지원
    <div className="dropdown">
      <div className="trigger" onClick={() => setIsOpen(!isOpen)}>
        {selected || '선택하세요'}
      </div>
      {isOpen && (
        <div className="menu">
          {options.map(option => (
            <div
              key={option.value}
              className="option"
              onClick={() => {
                setSelected(option.label);
                onSelect(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**After** (좋은 예):
```tsx
function Dropdown({ options, onSelect, label }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && activeIndex >= 0) {
          const option = options[activeIndex];
          setSelected(option.label);
          onSelect(option.value);
          setIsOpen(false);
          triggerRef.current?.focus();
        } else {
          setIsOpen(true);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        setActiveIndex(prev => Math.min(prev + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        triggerRef.current?.focus();
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
    }
  };

  const dropdownId = useId();

  return (
    <div className="dropdown" onKeyDown={handleKeyDown}>
      <label id={`${dropdownId}-label`}>{label}</label>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-labelledby={`${dropdownId}-label`}
        aria-activedescendant={activeIndex >= 0 ? `${dropdownId}-option-${activeIndex}` : undefined}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selected || '선택하세요'}
      </button>
      {isOpen && (
        <ul
          ref={listRef}
          role="listbox"
          aria-labelledby={`${dropdownId}-label`}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${dropdownId}-option-${index}`}
              role="option"
              aria-selected={selected === option.label}
              className={index === activeIndex ? 'active' : ''}
              onClick={() => {
                setSelected(option.label);
                onSelect(option.value);
                setIsOpen(false);
                triggerRef.current?.focus();
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**개선 효과**:
- 키보드만으로 완전한 조작 가능 (화살표, Enter, Escape, Home, End)
- 스크린 리더가 드롭다운의 상태를 정확히 전달 (열림/닫힘, 선택 항목)
- ARIA 속성으로 역할(role), 상태(aria-expanded), 관계(aria-labelledby) 명시
- WAI-ARIA Combobox 패턴 준수

#### 예시 3: 동적 콘텐츠 알림

**Before** (나쁜 예):
```tsx
function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const ws = new WebSocket('/ws/notifications');
    ws.onmessage = (event) => {
      const notif = JSON.parse(event.data);
      // 새 알림이 추가되지만 스크린 리더에 알려지지 않음
      setNotifications(prev => [notif, ...prev]);
    };
    return () => ws.close();
  }, []);

  return (
    <div>
      {notifications.map(n => (
        <div key={n.id}>{n.message}</div>
      ))}
    </div>
  );
}
```

**After** (좋은 예):
```tsx
function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const ws = new WebSocket('/ws/notifications');
    ws.onmessage = (event) => {
      const notif = JSON.parse(event.data);
      setNotifications(prev => [notif, ...prev]);
      // 스크린 리더에 새 알림을 알림
      setAnnouncement(`새 알림: ${notif.message}`);
    };
    return () => ws.close();
  }, []);

  return (
    <section aria-label="알림 센터">
      {/* aria-live="polite"로 스크린 리더가 현재 작업 후에 변경사항을 읽음 */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      <h2>알림 ({notifications.length}개)</h2>
      <ul role="list" aria-label="알림 목록">
        {notifications.length === 0 ? (
          <li>새 알림이 없습니다</li>
        ) : (
          notifications.map(n => (
            <li key={n.id} aria-label={`${n.type} 알림`}>
              <p>{n.message}</p>
              <time dateTime={n.createdAt}>
                {formatRelativeTime(n.createdAt)}
              </time>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
```

**개선 효과**:
- aria-live="polite"로 스크린 리더에 동적 변경사항 알림
- 빈 목록에 대한 안내 메시지 제공
- 시맨틱 요소(section, h2, ul, time)로 구조 명확화
- 접근 가능한 라벨로 컨텍스트 제공

### 적용 가이드

**시맨틱 HTML 우선 원칙**:
1. `<div onClick>` 대신 `<button>` 사용
2. `<div class="nav">` 대신 `<nav>` 사용
3. `<div class="header">` 대신 `<header>` 사용
4. ARIA는 시맨틱 HTML로 대체할 수 없을 때만 사용

**접근성 테스트 방법**:
- 키보드만으로 전체 페이지 탐색 테스트 (Tab, Enter, Escape)
- 스크린 리더로 페이지 내용 확인 (VoiceOver, NVDA)
- Lighthouse 접근성 점수 확인 (90점 이상 목표)
- axe-core 브라우저 확장으로 자동 검사

---

## 7. 통합 체크리스트

코드 리뷰 시 다음 표를 참고하여 우선순위별로 검토합니다.

### 우선순위 테이블

| 카테고리 | 검토 항목 | 우선순위 |
|----------|-----------|----------|
| **컴포넌트 패턴** | 컴포넌트가 200줄을 초과하는가? | High |
| **컴포넌트 패턴** | 하나의 컴포넌트가 여러 관심사를 처리하는가? | High |
| **컴포넌트 패턴** | Props가 5개를 초과하는가? | Medium |
| **컴포넌트 패턴** | 합성(Composition) 대신 조건부 렌더링이 과도한가? | Medium |
| **Hooks 규칙** | useEffect 의존성 배열이 불완전한가? | High |
| **Hooks 규칙** | useEffect에 클린업 함수가 누락되어 있는가? | High |
| **Hooks 규칙** | eslint-disable로 Hook 규칙 경고를 무시하는가? | High |
| **Hooks 규칙** | 반복되는 로직이 커스텀 Hook으로 추출되지 않았는가? | Medium |
| **Hooks 규칙** | useMemo/useCallback이 불필요하게 사용되는가? | Low |
| **상태 관리** | 파생 가능한 값을 별도 상태로 관리하는가? | High |
| **상태 관리** | useEffect로 상태 동기화를 하는가? (파생 상태 신호) | High |
| **상태 관리** | 로컬 상태가 전역 상태에 포함되어 있는가? | Medium |
| **상태 관리** | 복잡한 상태 전이를 여러 useState로 관리하는가? | Medium |
| **상태 관리** | 서버 상태와 클라이언트 상태가 혼재되어 있는가? | Medium |
| **렌더링 최적화** | 리스트에서 key로 배열 인덱스를 사용하는가? | High |
| **렌더링 최적화** | React.memo 컴포넌트에 인라인 객체/함수를 전달하는가? | Medium |
| **렌더링 최적화** | 빈번하게 변경되는 상태가 넓은 범위를 리렌더링하는가? | Medium |
| **렌더링 최적화** | 성능 측정 없이 과도한 최적화를 하는가? | Low |
| **이벤트 처리** | 빈번한 이벤트에 디바운스/쓰로틀이 없는가? | Medium |
| **이벤트 처리** | 폼 제출 시 중복 요청 방지가 없는가? | Medium |
| **이벤트 처리** | 모든 폼을 불필요하게 Controlled로 관리하는가? | Low |
| **접근성** | 클릭 가능한 요소에 `<div onClick>`을 사용하는가? | High |
| **접근성** | 이미지에 alt 속성이 없는가? | High |
| **접근성** | 폼 요소에 label이 연결되지 않았는가? | High |
| **접근성** | 키보드로 기능 접근이 불가능한가? | Medium |
| **접근성** | 동적 콘텐츠 변경이 스크린 리더에 전달되지 않는가? | Medium |

### 리뷰 순서 가이드

코드 리뷰 시 다음 순서로 검토를 권장합니다:

**1단계: 구조 검토 (Component Patterns)**
- 컴포넌트 크기와 책임 확인
- Props 개수와 합성 패턴 적용 여부 확인

**2단계: 상태 로직 검토 (State Management + Hooks)**
- 파생 상태 여부 확인
- useEffect 의존성 배열과 클린업 확인
- 상태 위치의 적절성 확인

**3단계: 렌더링 검토 (Rendering Optimization)**
- key prop 올바른 사용 확인
- 불필요한 리렌더링 패턴 확인

**4단계: 사용자 상호작용 검토 (Event Handling)**
- 폼 처리 패턴 확인
- 디바운스/쓰로틀 적용 여부 확인

**5단계: 접근성 검토 (Accessibility)**
- 시맨틱 HTML 사용 여부 확인
- 키보드 네비게이션 지원 확인
- ARIA 속성 적절성 확인

---

## Before/After 제공 가이드

모든 리뷰 코멘트는 다음 형식으로 제공합니다:

```markdown
**Before** (문제점):
[문제가 있는 코드]

**문제점**:
- 구체적인 문제 설명

**After** (개선안):
[개선된 코드]

**개선 효과**:
- 구체적인 개선 효과 1
- 구체적인 개선 효과 2
```

---

**이 가이드를 활용하여 React 프로젝트에서 일관되고 체계적인 코드 리뷰를 수행하세요!**
