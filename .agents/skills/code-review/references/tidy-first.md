# Tidy First 4가지 원칙 체크리스트

## 목차
- 개요
- 1. Guard Clauses (조기 반환)
- 2. Extract Function (함수 추출)
- 3. High Cohesion (높은 응집도)
- 4. Low Coupling (낮은 결합도)
- 통합 체크리스트
- 우선순위 가이드
- Before/After 제공 가이드


## 개요

**Tidy First**는 Kent Beck이 제안한 리팩토링 접근법으로, 기능 변경 전에 코드를 먼저 정리하는 것을 강조합니다. 이 문서는 4가지 핵심 원칙을 실제 코드 예시와 함께 설명합니다.

**4가지 핵심 원칙**:
1. **Guard Clauses** - 조기 반환으로 중첩 제거
2. **Extract Function** - 긴 함수를 작은 함수로 분리
3. **High Cohesion** - 관련된 기능끼리 묶기
4. **Low Coupling** - 의존성 최소화

---

## 1. Guard Clauses (조기 반환)

### 검토 항목

코드 리뷰 시 다음 항목을 확인합니다:

- [ ] 중첩된 if문이 3단계 이상인가?
- [ ] else 블록이 불필요하게 길게 이어지는가?
- [ ] 예외 조건을 함수 초반에 처리할 수 있는가?
- [ ] 함수의 주요 로직이 깊은 중첩 안에 숨겨져 있는가?
- [ ] 조건문의 부정(!)을 제거할 수 있는가?

### 개선 패턴

#### 예시 1: 기본 Guard Clauses

**Before** (나쁜 예):
```typescript
import { User } from '@/types/user'

// 중첩된 if문으로 가독성이 떨어지는 코드
export function processUser(user: User | null) {
  if (user) {
    if (user.age >= 18) {
      if (user.isActive) {
        return {
          success: true,
          message: `이메일 전송: ${user.email}`,
        }
      } else {
        return {
          success: false,
          message: '비활성 사용자입니다',
        }
      }
    } else {
      return {
        success: false,
        message: '미성년자는 사용할 수 없습니다',
      }
    }
  } else {
    return {
      success: false,
      message: '사용자 정보가 없습니다',
    }
  }
}
```

**문제점**:
- 3단계 중첩으로 인지 부하가 높음
- 주요 로직(이메일 전송)이 가장 깊은 곳에 숨겨짐
- else 블록이 불필요하게 많음
- 역순으로 읽어야 이해 가능 (안쪽에서 바깥쪽으로)

**After** (좋은 예):
```typescript
import { User } from '@/types/user'

// Guard Clauses (조기 반환)로 가독성 향상
export function processUser(user: User | null) {
  // Guard clauses: 예외 상황을 먼저 처리하고 조기 반환
  if (!user) {
    return {
      success: false,
      message: '사용자 정보가 없습니다',
    }
  }

  if (user.age < 18) {
    return {
      success: false,
      message: '미성년자는 사용할 수 없습니다',
    }
  }

  if (!user.isActive) {
    return {
      success: false,
      message: '비활성 사용자입니다',
    }
  }

  // 주요 로직은 마지막에 - 모든 조건을 만족한 경우
  return {
    success: true,
    message: `이메일 전송: ${user.email}`,
  }
}
```

**개선 효과**:
- ✅ 코드가 평탄해져 인지 부하 감소
- ✅ 주요 로직이 마지막에 명확히 표현됨
- ✅ 예외 조건과 정상 흐름이 분리됨
- ✅ 위에서 아래로 순차적으로 읽을 수 있음

#### 예시 2: 복잡한 조건문

**Before**:
```typescript
function calculateDiscount(user: User, order: Order) {
  if (user.isPremium) {
    if (order.totalAmount > 100000) {
      if (order.items.length > 5) {
        return order.totalAmount * 0.2 // 20% 할인
      } else {
        return order.totalAmount * 0.15 // 15% 할인
      }
    } else {
      return order.totalAmount * 0.1 // 10% 할인
    }
  } else {
    if (order.totalAmount > 100000) {
      return order.totalAmount * 0.05 // 5% 할인
    } else {
      return 0 // 할인 없음
    }
  }
}
```

**After**:
```typescript
function calculateDiscount(user: User, order: Order) {
  // 일반 사용자 처리
  if (!user.isPremium) {
    return order.totalAmount > 100000 ? order.totalAmount * 0.05 : 0
  }

  // 프리미엄 사용자 처리
  if (order.totalAmount <= 100000) {
    return order.totalAmount * 0.1
  }

  // 고액 주문 처리
  return order.items.length > 5
    ? order.totalAmount * 0.2
    : order.totalAmount * 0.15
}
```

### 적용 가이드

**1단계**: 가장 바깥쪽 조건부터 Guard Clause로 전환
```typescript
// Before
if (condition) {
  // 긴 로직
}

// After
if (!condition) return
// 긴 로직
```

**2단계**: 중첩된 조건을 순차적으로 펼치기
```typescript
// Before
if (a) {
  if (b) {
    if (c) {
      // 주요 로직
    }
  }
}

// After
if (!a) return
if (!b) return
if (!c) return
// 주요 로직
```

**3단계**: 주요 로직을 맨 아래로 이동

---

## 2. Extract Function (함수 추출)

### 검토 항목

- [ ] 함수가 30줄 이상인가?
- [ ] 함수 내에 명확히 구분되는 섹션(주석으로 분리)이 있는가?
- [ ] 중간에 빈 줄이 여러 개 있는가?
- [ ] 함수명만으로 내부 로직을 유추하기 어려운가?
- [ ] 함수가 여러 수준의 추상화를 섞어서 사용하는가?

### 개선 패턴

#### 예시 1: 긴 함수 분리

**Before** (나쁜 예):
```typescript
interface OrderItem {
  name: string
  price: number
  quantity: number
}

interface Customer {
  name: string
  isPremium: boolean
}

interface Order {
  items: OrderItem[]
  customer: Customer
}

// 긴 함수로 여러 책임을 가지고 있음
export function createInvoice(order: Order) {
  // 소계 계산
  let subtotal = 0
  for (const item of order.items) {
    subtotal += item.price * item.quantity
  }

  // 할인 적용
  let discountedAmount = subtotal
  if (order.customer.isPremium) {
    discountedAmount = subtotal * 0.9 // 10% 할인
  }

  // 배송비 계산
  let shippingFee = 0
  if (discountedAmount < 50000) {
    shippingFee = 3000
  }

  // 세금 계산
  const tax = discountedAmount * 0.1

  // 최종 금액
  const total = discountedAmount + shippingFee + tax

  return {
    subtotal,
    discount: subtotal - discountedAmount,
    shippingFee,
    tax,
    total,
  }
}
```

**문제점**:
- 50줄의 긴 함수로 가독성 저하
- 주석으로 섹션을 구분 (함수 분리 신호)
- 여러 수준의 추상화가 섞임 (계산 로직 + 비즈니스 규칙)
- 개별 계산 로직을 테스트하기 어려움

**After** (좋은 예):
```typescript
interface OrderItem {
  name: string
  price: number
  quantity: number
}

interface Customer {
  name: string
  isPremium: boolean
}

interface Order {
  items: OrderItem[]
  customer: Customer
}

// 함수 추출로 각 책임을 분리
export function createInvoice(order: Order) {
  const subtotal = calculateSubtotal(order.items)
  const discountedAmount = applyDiscount(subtotal, order.customer)
  const shippingFee = calculateShippingFee(discountedAmount)
  const tax = calculateTax(discountedAmount)
  const total = discountedAmount + shippingFee + tax

  return {
    subtotal,
    discount: subtotal - discountedAmount,
    shippingFee,
    tax,
    total,
  }
}

// 각 책임을 독립적인 함수로 추출
function calculateSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

function applyDiscount(amount: number, customer: Customer): number {
  return customer.isPremium ? amount * 0.9 : amount
}

function calculateShippingFee(amount: number): number {
  return amount < 50000 ? 3000 : 0
}

function calculateTax(amount: number): number {
  return amount * 0.1
}
```

**개선 효과**:
- ✅ 각 함수가 단일 책임을 가짐 (SRP)
- ✅ 테스트 작성이 용이해짐 (각 함수를 독립적으로 테스트)
- ✅ 재사용 가능한 함수 생성
- ✅ 메인 함수가 고수준 로직만 표현 (읽기 쉬움)
- ✅ 주석이 불필요해짐 (함수명이 설명)

#### 예시 2: 여러 수준의 추상화 분리

**Before**:
```typescript
function processPayment(order: Order, card: CreditCard) {
  // 카드 검증
  if (!card.number || card.number.length !== 16) {
    throw new Error('Invalid card number')
  }
  if (!card.cvv || card.cvv.length !== 3) {
    throw new Error('Invalid CVV')
  }

  // 금액 계산
  const amount = order.items.reduce((sum, item) => sum + item.price, 0)

  // 결제 API 호출
  const response = fetch('https://api.payment.com/charge', {
    method: 'POST',
    body: JSON.stringify({ card: card.number, amount })
  })

  // 결과 저장
  database.save({ orderId: order.id, amount, status: 'paid' })
}
```

**After**:
```typescript
function processPayment(order: Order, card: CreditCard) {
  validateCard(card)
  const amount = calculateOrderAmount(order)
  const paymentResult = chargeCard(card, amount)
  savePaymentRecord(order.id, amount, paymentResult)
}

function validateCard(card: CreditCard) {
  if (!card.number || card.number.length !== 16) {
    throw new Error('Invalid card number')
  }
  if (!card.cvv || card.cvv.length !== 3) {
    throw new Error('Invalid CVV')
  }
}

function calculateOrderAmount(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.price, 0)
}

function chargeCard(card: CreditCard, amount: number) {
  return fetch('https://api.payment.com/charge', {
    method: 'POST',
    body: JSON.stringify({ card: card.number, amount })
  })
}

function savePaymentRecord(orderId: number, amount: number, result: any) {
  database.save({ orderId, amount, status: 'paid' })
}
```

### 적용 가이드

**함수 추출 신호**:
1. 주석으로 섹션을 구분하고 있다 → 각 섹션을 함수로 추출
2. 빈 줄로 논리 블록을 구분하고 있다 → 각 블록을 함수로 추출
3. 변수명에 계산 과정이 들어간다 (`totalWithTax`, `discountedPrice`) → 계산 로직을 함수로 추출
4. 함수가 30줄 이상이다 → 의미 있는 단위로 분리

**함수 추출 기준**:
- 한 가지 일만 하는 함수
- 한 수준의 추상화만 다루는 함수
- 함수명으로 내부 로직을 유추할 수 있는 함수

---

## 3. High Cohesion (높은 응집도)

### 검토 항목

- [ ] 클래스/모듈에 관련 없는 기능이 섞여 있는가?
- [ ] "UserManager"가 이메일 발송, 결제 처리까지 하는가?
- [ ] 함수가 여러 데이터 소스를 동시에 조작하는가?
- [ ] 클래스의 메서드들이 서로 다른 필드를 사용하는가?
- [ ] 클래스명에 "Manager", "Util", "Helper"가 포함되어 있는가?

### 개선 패턴

#### 예시 1: 낮은 응집도 → 높은 응집도

**Before** (나쁜 예 - 낮은 응집도):
```typescript
// 여러 책임이 섞여 있음
export class UserManager {
  // 사용자 관리
  createUser(name: string, email: string) {
    return { id: Date.now(), name, email }
  }

  deleteUser(userId: number) {
    console.log(`User ${userId} deleted`)
  }

  // 이메일 발송 (사용자 관리와 관련 없음)
  sendWelcomeEmail(email: string) {
    console.log(`Welcome email sent to ${email}`)
  }

  sendPasswordResetEmail(email: string) {
    console.log(`Password reset email sent to ${email}`)
  }

  // 결제 처리 (사용자 관리와 관련 없음)
  processPayment(userId: number, amount: number) {
    console.log(`Payment of ${amount} processed for user ${userId}`)
  }

  refundPayment(userId: number, amount: number) {
    console.log(`Refund of ${amount} processed for user ${userId}`)
  }

  // 로깅 (사용자 관리와 관련 없음)
  logActivity(message: string) {
    console.log(`[LOG] ${message}`)
  }
}
```

**문제점**:
- 하나의 클래스가 너무 많은 책임을 가짐
- 사용자 관리, 이메일, 결제, 로깅이 모두 섞임
- 변경 이유가 여러 개 (SRP 위반)
- 테스트하기 어려움

**After** (좋은 예 - 높은 응집도):
```typescript
// 사용자 관리만 담당
export class UserManager {
  createUser(name: string, email: string) {
    return { id: Date.now(), name, email }
  }

  deleteUser(userId: number) {
    console.log(`User ${userId} deleted`)
  }
}

// 이메일 발송만 담당
export class EmailService {
  sendWelcomeEmail(email: string) {
    console.log(`Welcome email sent to ${email}`)
  }

  sendPasswordResetEmail(email: string) {
    console.log(`Password reset email sent to ${email}`)
  }
}

// 결제 처리만 담당
export class PaymentService {
  processPayment(userId: number, amount: number) {
    console.log(`Payment of ${amount} processed for user ${userId}`)
  }

  refundPayment(userId: number, amount: number) {
    console.log(`Refund of ${amount} processed for user ${userId}`)
  }
}

// 로깅만 담당
export class Logger {
  logActivity(message: string) {
    console.log(`[LOG] ${message}`)
  }
}
```

**개선 효과**:
- ✅ 각 클래스가 명확한 책임을 가짐
- ✅ 변경 시 영향 범위가 줄어듦
- ✅ 단위 테스트가 간단해짐
- ✅ 코드 재사용이 용이해짐

#### 예시 2: LCOM (Lack of Cohesion of Methods) 개선

**Before** (낮은 응집도):
```typescript
class OrderProcessor {
  private userId: number
  private productId: number
  private emailAddress: string
  private logLevel: string

  // userId, productId만 사용
  calculatePrice() {
    return this.userId * this.productId
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
}
```

**After** (높은 응집도):
```typescript
class OrderPriceCalculator {
  constructor(private userId: number, private productId: number) {}

  calculate() {
    return this.userId * this.productId
  }
}

class EmailNotifier {
  constructor(private emailAddress: string) {}

  send() {
    console.log(`Email sent to ${this.emailAddress}`)
  }
}

class Logger {
  constructor(private logLevel: string) {}

  log(message: string) {
    if (this.logLevel === 'debug') {
      console.log(message)
    }
  }
}
```

### 적용 가이드

**응집도 측정 방법**:
1. 클래스의 각 메서드가 사용하는 필드 비율 확인
2. 50% 미만이면 응집도가 낮음
3. 관련 없는 메서드를 별도 클래스로 분리

**응집도 개선 패턴**:
- "Manager", "Util", "Helper" 클래스를 구체적인 책임으로 분리
- 메서드가 공유하는 필드를 기준으로 클래스 분리
- 단일 책임 원칙(SRP) 적용

---

## 4. Low Coupling (낮은 결합도)

### 검토 항목

- [ ] 구체 클래스에 직접 의존하는가?
- [ ] 생성자에서 직접 인스턴스를 생성하는가?
- [ ] 테스트 시 실제 데이터베이스가 필요한가?
- [ ] 변경 시 여러 클래스를 동시에 수정해야 하는가?
- [ ] 순환 의존성이 있는가? (A → B → A)

### 개선 패턴

#### 예시 1: 높은 결합도 → 낮은 결합도

**Before** (나쁜 예 - 높은 결합도):
```typescript
export class Database {
  connect() {
    console.log('Connected to MySQL database')
  }

  query(sql: string) {
    console.log(`Executing: ${sql}`)
    return [{ id: 1, name: 'John' }]
  }
}

// UserService가 구체적인 Database 클래스에 직접 의존
export class UserService {
  private db: Database

  constructor() {
    this.db = new Database() // 강한 결합
    this.db.connect()
  }

  getUsers() {
    // Database의 구체적인 메서드에 의존
    return this.db.query('SELECT * FROM users')
  }

  getUser(id: number) {
    return this.db.query(`SELECT * FROM users WHERE id = ${id}`)
  }
}
```

**문제점**:
- Database를 변경하면 UserService도 수정 필요
- 테스트 시 실제 Database를 사용해야 함
- Database가 없으면 UserService를 사용할 수 없음
- Mock 객체로 테스트 불가능

**After** (좋은 예 - 낮은 결합도):
```typescript
// 인터페이스 정의 - 추상화에 의존
export interface IDatabase {
  connect(): void
  query(sql: string): any[]
}

// MySQL 구현
export class MySQLDatabase implements IDatabase {
  connect() {
    console.log('Connected to MySQL database')
  }

  query(sql: string) {
    console.log(`MySQL Executing: ${sql}`)
    return [{ id: 1, name: 'John' }]
  }
}

// PostgreSQL 구현 (쉽게 교체 가능)
export class PostgreSQLDatabase implements IDatabase {
  connect() {
    console.log('Connected to PostgreSQL database')
  }

  query(sql: string) {
    console.log(`PostgreSQL Executing: ${sql}`)
    return [{ id: 1, name: 'John' }]
  }
}

// Mock Database (테스트용)
export class MockDatabase implements IDatabase {
  connect() {
    console.log('Mock database connected')
  }

  query(sql: string) {
    return [{ id: 1, name: 'Test User' }]
  }
}

// UserService는 인터페이스에만 의존
export class UserService {
  // 의존성 주입 - 구체적인 구현이 아닌 인터페이스에 의존
  constructor(private db: IDatabase) {
    this.db.connect()
  }

  getUsers() {
    return this.db.query('SELECT * FROM users')
  }

  getUser(id: number) {
    return this.db.query(`SELECT * FROM users WHERE id = ${id}`)
  }
}

// 사용 예:
// const service1 = new UserService(new MySQLDatabase())
// const service2 = new UserService(new PostgreSQLDatabase())
// const testService = new UserService(new MockDatabase())
```

**개선 효과**:
- ✅ Database 구현을 쉽게 교체 가능
- ✅ 테스트 시 MockDatabase 사용 가능
- ✅ UserService는 IDatabase만 알면 됨
- ✅ 의존성 역전 원칙(DIP) 적용

#### 예시 2: 순환 의존성 제거

**Before**:
```typescript
// A가 B에 의존
class OrderService {
  constructor(private userService: UserService) {}

  createOrder(userId: number) {
    const user = this.userService.getUser(userId)
    // 주문 생성
  }
}

// B가 A에 의존 (순환 의존)
class UserService {
  constructor(private orderService: OrderService) {}

  getUser(userId: number) {
    const orders = this.orderService.getUserOrders(userId)
    // 사용자 정보 반환
  }
}
```

**After**:
```typescript
// 공통 인터페이스 추출
interface IOrderRepository {
  getUserOrders(userId: number): Order[]
}

class OrderService implements IOrderRepository {
  createOrder(userId: number) {
    // 주문 생성
  }

  getUserOrders(userId: number): Order[] {
    // 주문 조회
    return []
  }
}

class UserService {
  constructor(private orderRepository: IOrderRepository) {}

  getUser(userId: number) {
    const orders = this.orderRepository.getUserOrders(userId)
    // 사용자 정보 반환
  }
}
```

### 적용 가이드

**결합도 낮추는 패턴**:
1. **의존성 주입 (Dependency Injection)**
   - 생성자에서 직접 생성하지 말고 외부에서 주입

2. **인터페이스 도입**
   - 구체 클래스 대신 인터페이스에 의존

3. **팩토리 패턴**
   - 객체 생성을 별도 클래스로 분리

4. **이벤트 기반 통신**
   - 직접 호출 대신 이벤트로 통신

---

## 통합 체크리스트

코드 리뷰 시 다음 순서로 검토합니다:

### 1단계: Guard Clauses
- [ ] 조건문 중첩도 확인 (3단계 이상이면 조기 반환 제안)
- [ ] else 블록 길이 확인 (불필요한 else 제거 제안)

### 2단계: Extract Function
- [ ] 함수 길이 확인 (30줄 이상이면 분리 제안)
- [ ] 주석/빈 줄로 구분된 섹션 확인 (각 섹션을 함수로 추출 제안)

### 3단계: High Cohesion
- [ ] 클래스 책임 확인 (관련 없는 기능 분리 제안)
- [ ] LCOM 측정 (메서드가 필드의 50% 미만 사용 시 분리 제안)

### 4단계: Low Coupling
- [ ] 의존성 방향 확인 (구체 클래스 의존 시 인터페이스 도입 제안)
- [ ] 생성자 확인 (직접 인스턴스 생성 시 의존성 주입 제안)

---

## 우선순위 가이드

각 원칙을 적용할 때 다음 우선순위를 참고합니다:

| 원칙 | 우선순위 | 이유 |
|------|----------|------|
| **Low Coupling** | High | 테스트 불가능한 구조는 즉시 수정 필요 |
| **Guard Clauses** | Medium | 가독성 향상, 빠르게 적용 가능 |
| **Extract Function** | Medium | 유지보수성 향상 |
| **High Cohesion** | Medium | 장기적인 구조 개선 |

---

## Before/After 제공 가이드

모든 제안은 다음 형식으로 제공합니다:

```markdown
**Before** (문제점):
[코드 예시]

**문제점**:
- 구체적인 문제 설명

**After** (개선안):
[개선된 코드]

**개선 효과**:
- ✅ 구체적인 개선 효과 1
- ✅ 구체적인 개선 효과 2
```

---

**이 체크리스트를 활용하여 체계적인 코드 리뷰를 수행하세요!**
