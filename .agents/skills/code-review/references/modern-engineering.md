# Modern Software Engineering 5가지 원칙 체크리스트

## 개요

**Modern Software Engineering**은 소프트웨어 엔지니어링의 핵심 원칙들을 체계화한 것으로, 유지보수 가능하고 확장 가능한 코드를 작성하기 위한 가이드입니다.

**5가지 핵심 원칙**:
1. **Modularity** - 독립적인 모듈로 구성
2. **Cohesion** - 관련된 기능끼리 응집
3. **Separation of Concerns** - 관심사의 분리
4. **Information Hiding** - 정보 은닉과 캡슐화
5. **Coupling** - 최소한의 의존성

---

## 1. Modularity (모듈성)

### 검토 항목

- [ ] 이 컴포넌트를 독립적으로 테스트할 수 있는가?
- [ ] 다른 프로젝트로 이동 가능한가?
- [ ] 명확한 입출력 인터페이스가 있는가?
- [ ] 내부 구현을 변경해도 외부에 영향이 없는가?
- [ ] 전역 상태에 의존하지 않는가?

### 개선 패턴

#### 예시 1: 전역 상태 의존 → 명확한 인터페이스

**Anti-pattern** (낮은 모듈성):
```typescript
// 전역 상태에 의존
let globalConfig = {
  apiKey: 'xxx',
  baseUrl: 'https://api.example.com'
}

function fetchData() {
  // 전역 변수에 직접 접근
  return fetch(`${globalConfig.baseUrl}?key=${globalConfig.apiKey}`)
}

function processData(data: any) {
  // 전역 설정에 의존
  if (globalConfig.debug) {
    console.log(data)
  }
  return data
}
```

**문제점**:
- 전역 상태에 의존하여 테스트 어려움
- 함수 시그니처만으로 의존성 파악 불가
- 다른 프로젝트로 이동 시 전역 변수도 함께 필요

**Best Practice** (높은 모듈성):
```typescript
// 명확한 의존성 주입
interface Config {
  apiKey: string
  baseUrl: string
  debug?: boolean
}

function fetchData(config: Config) {
  return fetch(`${config.baseUrl}?key=${config.apiKey}`)
}

function processData(data: any, config: Config) {
  if (config.debug) {
    console.log(data)
  }
  return data
}

// 사용
const config: Config = {
  apiKey: 'xxx',
  baseUrl: 'https://api.example.com',
  debug: true
}

fetchData(config)
processData(someData, config)
```

**개선 효과**:
- ✅ 함수 시그니처만으로 의존성 명확히 파악
- ✅ 독립적인 테스트 가능
- ✅ 다른 프로젝트로 쉽게 이동 가능
- ✅ 설정을 다르게 하여 여러 인스턴스 사용 가능

#### 예시 2: 독립적인 모듈 설계

**Before** (낮은 모듈성):
```typescript
// 여러 외부 의존성이 숨겨져 있음
class DataProcessor {
  process(data: string) {
    // 데이터베이스에 직접 접근
    const user = database.getUser(1)

    // 로거에 직접 접근
    logger.info('Processing data')

    // 외부 API 직접 호출
    const result = httpClient.post('/api/data', data)

    return result
  }
}
```

**After** (높은 모듈성):
```typescript
// 모든 의존성을 명시적으로 주입
interface IDatabase {
  getUser(id: number): User
}

interface ILogger {
  info(message: string): void
}

interface IHttpClient {
  post(url: string, data: any): Promise<any>
}

class DataProcessor {
  constructor(
    private db: IDatabase,
    private logger: ILogger,
    private httpClient: IHttpClient
  ) {}

  process(data: string) {
    const user = this.db.getUser(1)
    this.logger.info('Processing data')
    const result = this.httpClient.post('/api/data', data)
    return result
  }
}

// 테스트 시 Mock 사용 가능
const processor = new DataProcessor(
  mockDatabase,
  mockLogger,
  mockHttpClient
)
```

### 적용 가이드

**모듈성 체크리스트**:
1. 함수/클래스가 전역 변수에 의존하지 않는가?
2. 모든 의존성이 매개변수나 생성자로 주입되는가?
3. 부작용(side effect)이 명확히 드러나는가?
4. 독립적으로 테스트 가능한가?

**모듈화 패턴**:
- Pure Function: 입력만으로 출력이 결정되는 함수
- Dependency Injection: 의존성을 외부에서 주입
- Interface Segregation: 필요한 인터페이스만 의존

---

## 2. Cohesion (응집성)

### 검토 항목

- [ ] 이 클래스의 모든 메서드가 같은 데이터를 사용하는가?
- [ ] 메서드 간에 공유하는 필드가 있는가?
- [ ] 클래스명이 "Manager", "Util", "Helper"인가? (낮은 응집도 신호)
- [ ] 클래스를 설명하는데 "and", "or"이 필요한가?
- [ ] 메서드가 클래스 필드의 50% 미만을 사용하는가?

### 측정 방법

**LCOM (Lack of Cohesion of Methods)** 메트릭 사용:

```
LCOM = (메서드 쌍 중 공통 필드를 사용하지 않는 쌍의 수) -
       (메서드 쌍 중 공통 필드를 사용하는 쌍의 수)

LCOM > 0: 낮은 응집도 (분리 필요)
LCOM = 0: 적절한 응집도
LCOM < 0: 높은 응집도
```

### 개선 패턴

#### 예시 1: LCOM 개선

**Before** (낮은 응집도 - LCOM 높음):
```typescript
class OrderProcessor {
  private userId: number
  private productId: number
  private emailAddress: string
  private logLevel: string
  private dbConnection: Database

  // userId, productId, dbConnection만 사용
  calculatePrice() {
    const user = this.dbConnection.query(`SELECT * FROM users WHERE id = ${this.userId}`)
    const product = this.dbConnection.query(`SELECT * FROM products WHERE id = ${this.productId}`)
    return user.discount * product.price
  }

  // emailAddress만 사용
  sendNotification() {
    console.log(`Email sent to ${this.emailAddress}`)
  }

  // logLevel만 사용
  logEvent(message: string) {
    if (this.logLevel === 'debug') {
      console.log(message)
    }
  }

  // dbConnection만 사용
  cleanup() {
    this.dbConnection.close()
  }
}
```

**문제점**:
- 메서드들이 서로 다른 필드를 사용 (낮은 응집도)
- 한 클래스에 너무 많은 책임
- LCOM 값이 높음

**After** (높은 응집도 - LCOM 낮음):
```typescript
// 가격 계산 책임만 담당
class OrderPriceCalculator {
  constructor(
    private userId: number,
    private productId: number,
    private db: Database
  ) {}

  calculate() {
    const user = this.db.query(`SELECT * FROM users WHERE id = ${this.userId}`)
    const product = this.db.query(`SELECT * FROM products WHERE id = ${this.productId}`)
    return user.discount * product.price
  }
}

// 이메일 발송 책임만 담당
class EmailNotifier {
  constructor(private emailAddress: string) {}

  send() {
    console.log(`Email sent to ${this.emailAddress}`)
  }
}

// 로깅 책임만 담당
class Logger {
  constructor(private logLevel: string) {}

  log(message: string) {
    if (this.logLevel === 'debug') {
      console.log(message)
    }
  }
}

// 데이터베이스 관리 책임만 담당
class DatabaseManager {
  constructor(private db: Database) {}

  cleanup() {
    this.db.close()
  }
}
```

**개선 효과**:
- ✅ 각 클래스의 모든 메서드가 모든 필드를 사용 (LCOM = 0)
- ✅ 단일 책임 원칙(SRP) 준수
- ✅ 테스트 작성 용이

#### 예시 2: "Manager" 클래스 분리

**Before**:
```typescript
// 이름에 "Manager"가 들어가면 낮은 응집도 신호
class FileManager {
  readFile(path: string) { /* ... */ }
  writeFile(path: string, data: string) { /* ... */ }
  deleteFile(path: string) { /* ... */ }
  compressFile(path: string) { /* ... */ }
  uploadFile(path: string, url: string) { /* ... */ }
  validateFile(path: string) { /* ... */ }
  parseFile(path: string) { /* ... */ }
}
```

**After**:
```typescript
// 읽기/쓰기/삭제만 담당
class FileStorage {
  read(path: string) { /* ... */ }
  write(path: string, data: string) { /* ... */ }
  delete(path: string) { /* ... */ }
}

// 압축만 담당
class FileCompressor {
  compress(path: string) { /* ... */ }
}

// 업로드만 담당
class FileUploader {
  upload(path: string, url: string) { /* ... */ }
}

// 검증만 담당
class FileValidator {
  validate(path: string) { /* ... */ }
}

// 파싱만 담당
class FileParser {
  parse(path: string) { /* ... */ }
}
```

### 적용 가이드

**응집도 개선 단계**:
1. 클래스의 모든 메서드와 필드 나열
2. 각 메서드가 사용하는 필드 표시
3. 공통 필드를 사용하는 메서드끼리 그룹화
4. 각 그룹을 별도 클래스로 분리

**응집도 경고 신호**:
- 클래스명: "Manager", "Util", "Helper", "Handler"
- 클래스 설명에 "and", "or" 사용
- 메서드가 클래스 필드의 50% 미만 사용

---

## 3. Separation of Concerns (관심사 분리)

### 검토 항목

- [ ] UI 코드에 비즈니스 로직이 섞여 있는가?
- [ ] 데이터베이스 쿼리와 비즈니스 로직이 같은 함수에 있는가?
- [ ] 로깅, 에러 처리, 메인 로직이 뒤섞여 있는가?
- [ ] HTTP 요청 처리와 비즈니스 로직이 분리되어 있는가?
- [ ] 레이어 간 명확한 경계가 있는가?

### 레이어 분리 가이드

**3-Layer Architecture**:
1. **Presentation Layer**: HTTP/GraphQL 입출력만
2. **Business Logic Layer**: 도메인 규칙과 워크플로우
3. **Data Access Layer**: DB 쿼리, 외부 API 호출

### 개선 패턴

#### 예시 1: UI와 비즈니스 로직 분리

**Before** (관심사 혼재):
```typescript
// React 컴포넌트에 비즈니스 로직 포함
function OrderForm() {
  const [items, setItems] = useState([])
  const [discount, setDiscount] = useState(0)

  const handleSubmit = () => {
    // 비즈니스 로직이 컴포넌트에 섞임
    let subtotal = 0
    for (const item of items) {
      subtotal += item.price * item.quantity
    }

    let discountedAmount = subtotal
    if (isPremiumUser) {
      discountedAmount = subtotal * 0.9
    }

    const shippingFee = discountedAmount < 50000 ? 3000 : 0
    const tax = discountedAmount * 0.1
    const total = discountedAmount + shippingFee + tax

    // API 호출도 컴포넌트에 섞임
    fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ total, items })
    })
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

**문제점**:
- UI 렌더링과 비즈니스 로직이 섞임
- 컴포넌트를 테스트하려면 React 환경 필요
- 비즈니스 로직 재사용 불가

**After** (관심사 분리):
```typescript
// 비즈니스 로직 레이어
class OrderService {
  calculateTotal(items: OrderItem[], isPremium: boolean) {
    const subtotal = this.calculateSubtotal(items)
    const discountedAmount = isPremium ? subtotal * 0.9 : subtotal
    const shippingFee = discountedAmount < 50000 ? 3000 : 0
    const tax = discountedAmount * 0.1
    return discountedAmount + shippingFee + tax
  }

  private calculateSubtotal(items: OrderItem[]) {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }
}

// API 레이어
class OrderAPI {
  async createOrder(orderData: OrderData) {
    return fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    })
  }
}

// UI 레이어 - 렌더링과 이벤트 핸들링만
function OrderForm() {
  const [items, setItems] = useState([])
  const orderService = new OrderService()
  const orderAPI = new OrderAPI()

  const handleSubmit = () => {
    const total = orderService.calculateTotal(items, isPremiumUser)
    orderAPI.createOrder({ total, items })
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

**개선 효과**:
- ✅ 비즈니스 로직을 독립적으로 테스트 가능
- ✅ 다른 UI (모바일, CLI)에서 재사용 가능
- ✅ 각 레이어의 책임이 명확

#### 예시 2: 로깅/에러 처리 분리

**Before**:
```typescript
function processOrder(orderId: number) {
  console.log(`[START] Processing order ${orderId}`)

  try {
    // 비즈니스 로직과 로깅이 섞임
    const order = database.getOrder(orderId)
    console.log(`[INFO] Order found: ${order.id}`)

    if (!order.isPaid) {
      console.error(`[ERROR] Order ${orderId} is not paid`)
      throw new Error('Order not paid')
    }

    const result = shipOrder(order)
    console.log(`[SUCCESS] Order ${orderId} shipped`)
    return result
  } catch (error) {
    console.error(`[ERROR] Failed to process order ${orderId}`, error)
    throw error
  }
}
```

**After**:
```typescript
// 로깅 책임 분리
class Logger {
  info(message: string) { console.log(`[INFO] ${message}`) }
  error(message: string, error?: any) { console.error(`[ERROR] ${message}`, error) }
}

// 에러 처리 책임 분리
class ErrorHandler {
  handle(error: Error, context: string) {
    this.logger.error(`Error in ${context}`, error)
    // 에러 추적 서비스로 전송
  }
}

// 비즈니스 로직만 담당
class OrderProcessor {
  constructor(
    private db: Database,
    private logger: Logger,
    private errorHandler: ErrorHandler
  ) {}

  process(orderId: number) {
    this.logger.info(`Processing order ${orderId}`)

    try {
      const order = this.db.getOrder(orderId)

      if (!order.isPaid) {
        throw new Error('Order not paid')
      }

      const result = this.shipOrder(order)
      this.logger.info(`Order ${orderId} shipped`)
      return result
    } catch (error) {
      this.errorHandler.handle(error, 'OrderProcessor.process')
      throw error
    }
  }
}
```

### 적용 가이드

**레이어 분리 체크리스트**:
1. Presentation: HTTP 요청/응답 변환만
2. Business Logic: 도메인 규칙, 워크플로우
3. Data Access: DB 쿼리, 외부 API 호출

**분리 규칙**:
- UI는 비즈니스 로직을 호출만 함 (구현하지 않음)
- 비즈니스 로직은 UI를 몰라야 함
- 데이터 접근은 별도 레이어로 분리

---

## 4. Information Hiding (정보 은닉)

### 검토 항목

- [ ] 클래스 필드가 public으로 노출되어 있는가?
- [ ] 내부 구현 세부사항이 외부에 드러나는가?
- [ ] Getter/Setter가 모든 필드에 있는가?
- [ ] private 메서드가 너무 많은가?
- [ ] 클래스 외부에서 내부 상태를 직접 변경할 수 있는가?

### 캡슐화 수준 체크

| Level | 설명 | 평가 |
|-------|------|------|
| **Level 1** | public 필드 직접 노출 | ❌ 최악 |
| **Level 2** | private 필드 + 모든 필드에 getter/setter | ⚠️ 나쁨 |
| **Level 3** | private 필드 + 필요한 메서드만 노출 | ✅ 보통 |
| **Level 4** | 구현 세부사항 완전히 숨기고 행위만 노출 | ✅✅ 좋음 |

### 개선 패턴

#### 예시 1: Level 1 → Level 4

**Level 1** (최악):
```typescript
class BankAccount {
  public balance: number = 0
  public transactions: Transaction[] = []
}

// 외부에서 직접 조작 가능 (위험!)
const account = new BankAccount()
account.balance = 1000000 // 직접 수정 가능
account.transactions = [] // 거래 내역 삭제 가능
```

**Level 2** (나쁨):
```typescript
class BankAccount {
  private _balance: number = 0
  private _transactions: Transaction[] = []

  // 모든 필드에 getter/setter (의미 없는 캡슐화)
  getBalance() { return this._balance }
  setBalance(value: number) { this._balance = value }

  getTransactions() { return this._transactions }
  setTransactions(value: Transaction[]) { this._transactions = value }
}

// 여전히 외부에서 조작 가능
account.setBalance(1000000)
account.setTransactions([])
```

**Level 3** (보통):
```typescript
class BankAccount {
  private balance: number = 0
  private transactions: Transaction[] = []

  // 필요한 메서드만 노출
  getBalance() {
    return this.balance
  }

  deposit(amount: number) {
    this.balance += amount
    this.transactions.push({ type: 'deposit', amount })
  }

  withdraw(amount: number) {
    if (this.balance >= amount) {
      this.balance -= amount
      this.transactions.push({ type: 'withdraw', amount })
    }
  }
}
```

**Level 4** (좋음 - Tell, Don't Ask):
```typescript
class BankAccount {
  private balance: number = 0
  private transactions: Transaction[] = []

  // 행위만 노출, 상태는 숨김
  deposit(amount: number) {
    this.validateAmount(amount)
    this.addToBalance(amount)
    this.recordTransaction('deposit', amount)
  }

  withdraw(amount: number) {
    this.validateAmount(amount)
    this.ensureSufficientFunds(amount)
    this.deductFromBalance(amount)
    this.recordTransaction('withdraw', amount)
  }

  canAfford(amount: number): boolean {
    return this.balance >= amount
  }

  // 내부 구현은 완전히 숨김
  private validateAmount(amount: number) {
    if (amount <= 0) throw new Error('Invalid amount')
  }

  private ensureSufficientFunds(amount: number) {
    if (this.balance < amount) throw new Error('Insufficient funds')
  }

  private addToBalance(amount: number) {
    this.balance += amount
  }

  private deductFromBalance(amount: number) {
    this.balance -= amount
  }

  private recordTransaction(type: string, amount: number) {
    this.transactions.push({ type, amount, date: new Date() })
  }
}
```

**개선 효과**:
- ✅ 내부 상태를 직접 접근 불가
- ✅ 비즈니스 규칙이 클래스 내부에서 강제됨
- ✅ 구현 변경 시 외부 영향 없음
- ✅ 테스트 시 행위에 집중 가능

#### 예시 2: Tell, Don't Ask 원칙

**Before** (Ask - 나쁜 예):
```typescript
// 외부에서 상태를 물어보고 조작
if (user.getAge() >= 18 && user.isActive() && user.hasVerifiedEmail()) {
  user.setPermission('adult')
  user.setAccessLevel('premium')
}
```

**After** (Tell - 좋은 예):
```typescript
// User 클래스 내부
class User {
  private age: number
  private active: boolean
  private emailVerified: boolean
  private permission: string
  private accessLevel: string

  // 행위만 노출
  grantAdultAccess() {
    if (this.canGrantAdultAccess()) {
      this.permission = 'adult'
      this.accessLevel = 'premium'
    }
  }

  private canGrantAdultAccess(): boolean {
    return this.age >= 18 && this.active && this.emailVerified
  }
}

// 외부에서는 명령만 수행
user.grantAdultAccess()
```

### 적용 가이드

**정보 은닉 체크리스트**:
1. 모든 필드를 private으로 시작
2. Getter/Setter를 자동으로 만들지 말 것
3. 행위 중심 메서드 설계 (getX/setX 대신 doSomething)
4. Tell, Don't Ask 원칙 적용

---

## 5. Coupling (결합도)

### 검토 항목

- [ ] 이 클래스가 다른 클래스를 직접 생성하는가?
- [ ] 의존성 개수가 5개 이상인가?
- [ ] 의존성이 양방향인가? (순환 의존)
- [ ] 변경 시 연쇄적으로 여러 파일을 수정해야 하는가?
- [ ] 테스트 시 많은 Mock이 필요한가?

### 결합도 측정 지표

**Coupling Metrics**:

1. **Afferent Coupling (Ca)**: 이 모듈에 의존하는 모듈 수
2. **Efferent Coupling (Ce)**: 이 모듈이 의존하는 모듈 수
3. **Instability (I) = Ce / (Ca + Ce)**
   - I = 0: 완전히 안정적 (많이 의존받음, 변경 어려움)
   - I = 1: 불안정 (많이 의존함, 변경 쉬움)

**이상적인 구조**:
- 도메인 모델: I ≈ 0 (안정적)
- 유틸리티: I ≈ 0 (안정적)
- UI 컴포넌트: I ≈ 1 (불안정, 자주 변경)

### 개선 패턴

#### 예시 1: 의존성 개수 줄이기

**Before** (높은 결합도):
```typescript
// 8개 의존성 - 너무 많음
class OrderController {
  constructor(
    private userService: UserService,
    private productService: ProductService,
    private inventoryService: InventoryService,
    private paymentService: PaymentService,
    private shippingService: ShippingService,
    private emailService: EmailService,
    private loggerService: LoggerService,
    private analyticsService: AnalyticsService
  ) {}

  createOrder(orderData: OrderData) {
    const user = this.userService.getUser(orderData.userId)
    const product = this.productService.getProduct(orderData.productId)
    this.inventoryService.checkStock(product.id)
    this.paymentService.charge(user, product.price)
    this.shippingService.ship(user.address, product)
    this.emailService.sendConfirmation(user.email)
    this.loggerService.log('Order created')
    this.analyticsService.track('order_created')
  }
}
```

**문제점**:
- 의존성이 너무 많음 (8개)
- 테스트 시 8개 Mock 필요
- 변경 영향 범위가 넓음

**After** (낮은 결합도):
```typescript
// Facade 패턴으로 의존성 그룹화
class OrderFacade {
  constructor(
    private userService: UserService,
    private productService: ProductService,
    private inventoryService: InventoryService
  ) {}

  validateOrder(orderData: OrderData) {
    const user = this.userService.getUser(orderData.userId)
    const product = this.productService.getProduct(orderData.productId)
    this.inventoryService.checkStock(product.id)
    return { user, product }
  }
}

class PaymentFacade {
  constructor(
    private paymentService: PaymentService,
    private emailService: EmailService
  ) {}

  processPayment(user: User, amount: number) {
    this.paymentService.charge(user, amount)
    this.emailService.sendConfirmation(user.email)
  }
}

class LoggingFacade {
  constructor(
    private loggerService: LoggerService,
    private analyticsService: AnalyticsService
  ) {}

  trackEvent(event: string) {
    this.loggerService.log(event)
    this.analyticsService.track(event)
  }
}

// 3개 의존성으로 축소
class OrderController {
  constructor(
    private orderFacade: OrderFacade,
    private paymentFacade: PaymentFacade,
    private loggingFacade: LoggingFacade
  ) {}

  createOrder(orderData: OrderData) {
    const { user, product } = this.orderFacade.validateOrder(orderData)
    this.paymentFacade.processPayment(user, product.price)
    this.loggingFacade.trackEvent('order_created')
  }
}
```

#### 예시 2: 순환 의존성 제거

**Before** (순환 의존):
```typescript
// User가 Order에 의존
class User {
  constructor(private orderService: OrderService) {}

  getOrders() {
    return this.orderService.getUserOrders(this.id)
  }
}

// Order가 User에 의존 (순환!)
class OrderService {
  constructor(private userService: UserService) {}

  getUserOrders(userId: number) {
    const user = this.userService.getUser(userId)
    // ...
  }
}
```

**After** (순환 제거):
```typescript
// Repository 패턴으로 순환 제거
interface IOrderRepository {
  findByUserId(userId: number): Order[]
}

class User {
  constructor(private orderRepository: IOrderRepository) {}

  getOrders() {
    return this.orderRepository.findByUserId(this.id)
  }
}

class OrderService implements IOrderRepository {
  findByUserId(userId: number): Order[] {
    // 구현
    return []
  }
}

// User는 IOrderRepository에만 의존 (순환 제거)
```

### 적용 가이드

**결합도 낮추는 패턴**:
1. **의존성 주입**: 생성자에서 직접 생성하지 말고 주입
2. **인터페이스 도입**: 구체 클래스 대신 인터페이스 의존
3. **Facade 패턴**: 여러 의존성을 하나로 그룹화
4. **이벤트 기반**: 직접 호출 대신 이벤트 발행/구독
5. **의존성 역전**: 안정적인 추상화에 의존

---

## 통합 적용 가이드

### 리뷰 순서

코드 리뷰 시 다음 순서로 검토합니다:

1. **Modularity** 확인: 독립적인 테스트 가능 여부
2. **Cohesion** 확인: 단일 책임 원칙 준수 여부
3. **Separation of Concerns** 확인: 레이어 분리 여부
4. **Information Hiding** 확인: 캡슐화 수준
5. **Coupling** 확인: 의존성 방향과 개수

### 우선순위 부여

| 원칙 | 우선순위 | 이유 |
|------|----------|------|
| **Coupling** | High | 순환 의존, 테스트 불가는 즉시 수정 |
| **Separation of Concerns** | High | 레이어 혼재는 장기적 유지보수 어려움 |
| **Cohesion** | Medium | 낮은 응집도는 점진적 개선 가능 |
| **Modularity** | Medium | 전역 의존은 리팩토링으로 개선 |
| **Information Hiding** | Low | 캡슐화는 점진적 개선 가능 |

### 체크리스트 요약

**High Priority** (즉시 수정):
- [ ] 순환 의존성 존재
- [ ] UI에 비즈니스 로직 혼재
- [ ] 의존성 5개 이상
- [ ] 테스트 불가능한 구조

**Medium Priority** (다음 리팩토링):
- [ ] LCOM > 0 (낮은 응집도)
- [ ] 전역 상태 의존
- [ ] "Manager" 클래스
- [ ] 레이어 경계 불명확

**Low Priority** (시간 여유 시):
- [ ] public 필드 노출
- [ ] Getter/Setter 남용
- [ ] 구현 세부사항 노출

---

**이 체크리스트를 활용하여 체계적인 구조 개선을 수행하세요!**
