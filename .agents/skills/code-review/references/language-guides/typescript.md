# TypeScript 코드 리뷰 가이드

## 목차
- 개요
- 1. 타입 안전성 (Type Safety)
- 2. 제네릭 베스트 프랙티스 (Generics Best Practices)
- 3. 인터페이스/타입 설계 (Interface & Type Design)
- 4. 열거형과 상수 (Enums & Constants)
- 5. 에러 처리 (Error Handling)
- 6. 모듈 구성 (Module Organization)
- 7. 통합 체크리스트
- 리뷰 순서 가이드
- Before/After 제공 가이드


## 개요

**TypeScript**는 JavaScript에 정적 타입 시스템을 추가하여 코드의 안전성과 유지보수성을 높이는 언어입니다. 그러나 타입 시스템을 올바르게 활용하지 않으면 `any`로 도배된 "타입이 있는 JavaScript"가 되기 쉽습니다. 이 가이드는 TypeScript의 타입 시스템을 최대한 활용하여 안전하고 표현력 있는 코드를 작성하기 위한 코드 리뷰 체크리스트를 제공합니다.

**6가지 핵심 영역**:
1. **타입 안전성** - `any` 제거, 타입 가드, 타입 단언 최소화
2. **제네릭 베스트 프랙티스** - 제약 조건, 유틸리티 타입, 남용 방지
3. **인터페이스/타입 설계** - Discriminated Union, readonly, ISP
4. **열거형과 상수** - `as const`, 리터럴 유니온, 상수 객체
5. **에러 처리** - `unknown` catch, Result 패턴, 커스텀 에러
6. **모듈 구성** - Barrel export, 순환 의존성, 경로 별칭

---

## 1. 타입 안전성 (Type Safety)

### 검토 항목

- [ ] `any` 타입이 사용되고 있는가? (`unknown`이나 구체적 타입으로 대체 가능한가?)
- [ ] 타입 가드 없이 타입 단언(`as`)을 사용하고 있는가?
- [ ] `null`/`undefined` 가능성이 있는 값을 적절히 처리하고 있는가?
- [ ] Optional Chaining(`?.`)과 Nullish Coalescing(`??`)을 활용하고 있는가?
- [ ] `@ts-ignore` 또는 `@ts-expect-error`가 정당한 이유 없이 사용되는가?
- [ ] 함수 반환 타입이 명시적으로 선언되어 있는가? (공개 API의 경우)

### 개선 패턴

#### 1-1. `any` 타입 제거 패턴

**Before** (나쁜 예):
```typescript
// any를 사용하면 타입 체크가 완전히 무력화됨
function parseApiResponse(response: any): any {
  const data = response.data
  const users = data.map((item: any) => ({
    name: item.name,
    age: item.age,
    email: item.email,
  }))
  return users
}

// 잘못된 접근도 컴파일 에러 없음
const result = parseApiResponse({ invalid: true })
result.nonExistent.method() // 런타임 에러 발생
```

**문제점**:
- 컴파일 시점에 타입 검사가 수행되지 않아 런타임 에러 발생 가능
- IDE의 자동 완성, 리팩토링 지원 불가
- 코드만으로 데이터 구조를 파악하기 어려움

**After** (좋은 예):
```typescript
interface ApiResponse<T> {
  data: T[]
  status: number
  message: string
}

interface UserDTO {
  name: string
  age: number
  email: string
}

interface User {
  name: string
  age: number
  email: string
}

function parseApiResponse(response: ApiResponse<UserDTO>): User[] {
  return response.data.map((item) => ({
    name: item.name,
    age: item.age,
    email: item.email,
  }))
}

// 컴파일 시점에 오류 감지
// parseApiResponse({ invalid: true }) // Error: Property 'data' is missing
```

**개선 효과**:
- 컴파일 시점에 타입 불일치를 감지하여 런타임 에러 방지
- IDE 자동 완성으로 개발 생산성 향상
- 코드 자체가 데이터 구조의 문서 역할

#### 1-2. 타입 가드 (Type Guards) 활용

**Before** (나쁜 예):
```typescript
interface Dog {
  bark(): void
  breed: string
}

interface Cat {
  meow(): void
  color: string
}

type Animal = Dog | Cat

function handleAnimal(animal: Animal) {
  // 타입 단언으로 강제 캐스팅 - 런타임 에러 위험
  (animal as Dog).bark()
}

function processValue(value: string | number | null) {
  // 타입 단언 남용
  const length = (value as string).length // value가 number면 undefined
  return length
}
```

**문제점**:
- `as` 단언은 컴파일러를 무시하는 것으로, 런타임 안전성을 보장하지 않음
- 유니온 타입의 각 경우를 명시적으로 처리하지 않음
- 코드 변경 시 누락된 케이스를 감지할 수 없음

**After** (좋은 예):
```typescript
interface Dog {
  kind: 'dog'
  bark(): void
  breed: string
}

interface Cat {
  kind: 'cat'
  meow(): void
  color: string
}

type Animal = Dog | Cat

// 사용자 정의 타입 가드
function isDog(animal: Animal): animal is Dog {
  return animal.kind === 'dog'
}

function isCat(animal: Animal): animal is Cat {
  return animal.kind === 'cat'
}

function handleAnimal(animal: Animal) {
  if (isDog(animal)) {
    animal.bark() // Dog 타입으로 자동 좁혀짐
  } else {
    animal.meow() // Cat 타입으로 자동 좁혀짐
  }
}

function processValue(value: string | number | null) {
  if (value === null) {
    return 0
  }
  if (typeof value === 'string') {
    return value.length
  }
  return value // number 타입으로 자동 좁혀짐
}
```

**개선 효과**:
- 런타임에 실제 타입을 검증하여 안전성 확보
- TypeScript 컴파일러가 자동으로 타입을 좁혀줌 (Type Narrowing)
- 새로운 타입이 추가되면 `exhaustive check`로 누락 감지 가능

#### 1-3. Optional Chaining과 Nullish Coalescing

**Before** (나쁜 예):
```typescript
interface Company {
  name: string
  address?: {
    city?: string
    zipCode?: string
  }
  employees?: Array<{
    name: string
    department?: {
      name: string
    }
  }>
}

function getCompanyInfo(company: Company | null | undefined) {
  // 깊은 중첩 조건으로 null 체크
  let city = 'Unknown'
  if (company) {
    if (company.address) {
      if (company.address.city) {
        city = company.address.city
      }
    }
  }

  // || 연산자의 함정: 0, '', false도 기본값으로 대체됨
  const employeeCount = (company && company.employees && company.employees.length) || 0
  const zipCode = (company && company.address && company.address.zipCode) || 'N/A'

  return { city, employeeCount, zipCode }
}
```

**After** (좋은 예):
```typescript
function getCompanyInfo(company: Company | null | undefined) {
  // Optional Chaining으로 안전한 접근
  const city = company?.address?.city ?? 'Unknown'

  // Nullish Coalescing: null과 undefined만 기본값으로 대체
  // 0, '', false는 유효한 값으로 유지됨
  const employeeCount = company?.employees?.length ?? 0
  const zipCode = company?.address?.zipCode ?? 'N/A'

  // 배열 접근에도 활용
  const firstEmployeeDept = company?.employees?.[0]?.department?.name ?? '미배정'

  return { city, employeeCount, zipCode, firstEmployeeDept }
}
```

**개선 효과**:
- 중첩된 null 체크 조건문을 한 줄로 단순화
- `??` 연산자로 `0`, `''`, `false`를 유효한 값으로 올바르게 처리
- 코드의 의도가 명확해져 가독성 향상

#### 1-4. 타입 단언 (Type Assertion) 최소화

**Before** (나쁜 예):
```typescript
// DOM 요소에 대한 무분별한 타입 단언
const input = document.getElementById('email') as HTMLInputElement
input.value = 'test@email.com' // 요소가 없으면 런타임 에러

// API 응답에 대한 타입 단언
async function fetchUser(id: number) {
  const response = await fetch(`/api/users/${id}`)
  const data = await response.json()
  return data as User // 실제 응답 구조를 검증하지 않음
}

// 복잡한 타입 변환에 double assertion 사용
const value = someValue as unknown as TargetType // 위험한 패턴
```

**After** (좋은 예):
```typescript
// DOM 요소: null 체크 후 instanceof 사용
const element = document.getElementById('email')
if (element instanceof HTMLInputElement) {
  element.value = 'test@email.com'
}

// API 응답: 런타임 검증 함수 사용
interface User {
  id: number
  name: string
  email: string
}

function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    typeof (data as Record<string, unknown>).id === 'number' &&
    'name' in data &&
    typeof (data as Record<string, unknown>).name === 'string' &&
    'email' in data &&
    typeof (data as Record<string, unknown>).email === 'string'
  )
}

async function fetchUser(id: number): Promise<User | null> {
  const response = await fetch(`/api/users/${id}`)
  const data: unknown = await response.json()

  if (isUser(data)) {
    return data
  }

  console.error('Invalid user data received:', data)
  return null
}
```

**개선 효과**:
- 런타임에서 실제 데이터를 검증하여 타입 안전성 확보
- API 응답 구조가 변경되어도 즉시 감지 가능
- `as`를 사용하지 않아 컴파일러 보호를 유지

---

## 2. 제네릭 베스트 프랙티스 (Generics Best Practices)

### 검토 항목

- [ ] 제네릭 타입 파라미터에 의미 있는 이름을 사용하는가? (단일 문자 `T`가 적절한가?)
- [ ] 제네릭에 적절한 제약 조건(`extends`)을 부여했는가?
- [ ] 유틸리티 타입(`Partial`, `Pick`, `Omit` 등)으로 대체 가능한 커스텀 타입이 있는가?
- [ ] 제네릭이 과도하게 복잡해진 곳은 없는가? (3단계 이상 중첩)
- [ ] 불필요한 제네릭(한 곳에서만 사용)이 있는가?

### 개선 패턴

#### 2-1. 제약 조건 (Constraints) 활용

**Before** (나쁜 예):
```typescript
// 제약 조건 없는 제네릭: 어떤 타입이든 허용
function getProperty<T>(obj: T, key: string): any {
  return (obj as any)[key]
}

// 런타임 에러 가능
getProperty(42, 'name') // undefined, 에러 아님
getProperty(null, 'name') // TypeError

function merge<T, U>(a: T, b: U) {
  return { ...a, ...b } // Error: Spread types may only be created from object types
}
```

**After** (좋은 예):
```typescript
// keyof 제약으로 존재하는 키만 허용
function getProperty<T extends object, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

const user = { name: 'Alice', age: 30 }
getProperty(user, 'name') // string 타입 반환
// getProperty(user, 'invalid') // Error: Argument of type '"invalid"' is not assignable

// Record 제약으로 객체 타입만 허용
function merge<T extends Record<string, unknown>, U extends Record<string, unknown>>(
  a: T,
  b: U
): T & U {
  return { ...a, ...b }
}

merge({ a: 1 }, { b: 2 }) // OK
// merge(42, { b: 2 }) // Error: number is not assignable to Record<string, unknown>
```

**개선 효과**:
- 컴파일 시점에 유효하지 않은 인자를 차단
- 반환 타입이 정확하게 추론되어 후속 코드의 타입 안전성 보장
- IDE에서 유효한 키만 자동 완성으로 제안

#### 2-2. 유틸리티 타입 활용

**Before** (나쁜 예):
```typescript
interface User {
  id: number
  name: string
  email: string
  password: string
  createdAt: Date
  updatedAt: Date
}

// 수동으로 부분 타입 정의 - User가 변경되면 동기화 필요
interface UserUpdate {
  name?: string
  email?: string
}

// 수동으로 응답 타입 정의 - password 노출 위험
interface UserResponse {
  id: number
  name: string
  email: string
  createdAt: Date
  updatedAt: Date
}

// 중복된 타입 정의
interface CreateUserInput {
  name: string
  email: string
  password: string
}
```

**After** (좋은 예):
```typescript
interface User {
  id: number
  name: string
  email: string
  password: string
  createdAt: Date
  updatedAt: Date
}

// Partial: 모든 필드를 선택적으로
type UserUpdate = Partial<Pick<User, 'name' | 'email'>>

// Omit: 특정 필드를 제외
type UserResponse = Omit<User, 'password'>

// Pick: 필요한 필드만 선택
type CreateUserInput = Pick<User, 'name' | 'email' | 'password'>

// Record: 키-값 매핑
type UserPermissions = Record<string, boolean>

// Required: 모든 필드를 필수로
type StrictUser = Required<User>

// Readonly: 불변 객체
type FrozenUser = Readonly<User>

// 조합 활용 예
type UserTableRow = Pick<User, 'id' | 'name' | 'email'> & {
  displayName: string
  isOnline: boolean
}
```

**개선 효과**:
- 원본 타입 변경 시 파생 타입이 자동으로 동기화
- 타입 중복 제거로 유지보수 비용 절감
- 타입 의도가 명확하게 드러남 (`Omit<User, 'password'>`는 "비밀번호 제외"를 직관적으로 표현)

#### 2-3. 제네릭 남용 주의

**Before** (나쁜 예):
```typescript
// 불필요한 제네릭: T가 한 곳에서만 사용됨
function greet<T extends string>(name: T): string {
  return `Hello, ${name}`
}

// 과도하게 복잡한 제네릭
function processData<
  T extends Record<string, unknown>,
  K extends keyof T,
  V extends T[K],
  R extends Array<V>
>(data: T, key: K, transform: (value: V) => R): R {
  return transform(data[key] as V)
}

// 제네릭으로 해결할 필요 없는 단순한 경우
function identity<T>(value: T): T {
  return value
}
const result = identity<string>('hello') // 그냥 'hello'로 충분
```

**After** (좋은 예):
```typescript
// 제네릭 제거: 구체적 타입으로 충분
function greet(name: string): string {
  return `Hello, ${name}`
}

// 적절한 수준의 제네릭
function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((item) => item[key])
}

// 제네릭이 진정 필요한 경우: 입력-출력 타입 관계 보존
function wrapInArray<T>(value: T): T[] {
  return [value]
}

const numbers = wrapInArray(42) // number[]
const strings = wrapInArray('hello') // string[]
```

**개선 효과**:
- 코드 복잡도 감소로 가독성 향상
- 제네릭이 타입 관계를 실제로 표현하는 곳에만 사용
- 불필요한 타입 파라미터 제거로 API가 단순해짐

---

## 3. 인터페이스/타입 설계 (Interface & Type Design)

### 검토 항목

- [ ] 유니온 타입을 Discriminated Union 패턴으로 안전하게 처리하는가?
- [ ] 변경되면 안 되는 데이터에 `readonly`를 사용하는가?
- [ ] 인터페이스가 지나치게 큰가? (Interface Segregation Principle 위반)
- [ ] `type`과 `interface`의 선택이 적절한가?
- [ ] 인덱스 시그니처(`[key: string]: any`)를 남용하고 있는가?

### 개선 패턴

#### 3-1. Discriminated Union 패턴

**Before** (나쁜 예):
```typescript
interface Shape {
  type: string
  width?: number
  height?: number
  radius?: number
  sideLength?: number
}

function calculateArea(shape: Shape): number {
  if (shape.type === 'circle') {
    return Math.PI * shape.radius! * shape.radius! // Non-null assertion 필요
  } else if (shape.type === 'rectangle') {
    return shape.width! * shape.height!
  } else if (shape.type === 'square') {
    return shape.sideLength! * shape.sideLength!
  }
  return 0 // 알 수 없는 타입 처리 누락 가능
}
```

**문제점**:
- 모든 필드가 optional이라 `!` non-null assertion 남용
- 새로운 도형을 추가해도 컴파일러가 누락을 감지 못함
- 유효하지 않은 조합 가능 (예: `{ type: 'circle', width: 10 }`)

**After** (좋은 예):
```typescript
interface Circle {
  kind: 'circle'
  radius: number
}

interface Rectangle {
  kind: 'rectangle'
  width: number
  height: number
}

interface Square {
  kind: 'square'
  sideLength: number
}

type Shape = Circle | Rectangle | Square

function calculateArea(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius * shape.radius
    case 'rectangle':
      return shape.width * shape.height
    case 'square':
      return shape.sideLength * shape.sideLength
    default:
      // 새로운 도형 추가 시 여기서 컴파일 에러 발생
      const _exhaustiveCheck: never = shape
      throw new Error(`Unknown shape: ${_exhaustiveCheck}`)
  }
}
```

**개선 효과**:
- 각 도형 타입에 필요한 필드만 정의하여 유효하지 않은 조합 방지
- `switch` 문에서 자동 타입 좁혀짐으로 `!` 불필요
- `never` 타입을 활용한 `exhaustive check`로 새로운 타입 추가 시 누락 감지

#### 3-2. readonly 프로퍼티 활용

**Before** (나쁜 예):
```typescript
interface Config {
  apiUrl: string
  timeout: number
  retryCount: number
}

interface State {
  users: User[]
  selectedId: number | null
}

function initConfig(): Config {
  return { apiUrl: 'https://api.example.com', timeout: 5000, retryCount: 3 }
}

const config = initConfig()
config.apiUrl = 'https://malicious.com' // 의도치 않은 설정 변경 가능

function processState(state: State) {
  state.users.push({ id: 99, name: 'Hacker' }) // 외부에서 상태 직접 변경 가능
  state.users = [] // 배열 참조 자체도 변경 가능
}
```

**After** (좋은 예):
```typescript
interface Config {
  readonly apiUrl: string
  readonly timeout: number
  readonly retryCount: number
}

interface State {
  readonly users: readonly User[]
  readonly selectedId: number | null
}

function initConfig(): Config {
  return { apiUrl: 'https://api.example.com', timeout: 5000, retryCount: 3 }
}

const config = initConfig()
// config.apiUrl = 'https://malicious.com' // Error: Cannot assign to 'apiUrl'

function processState(state: State): State {
  // state.users.push({ id: 99, name: 'Hacker' }) // Error: Property 'push' does not exist
  // state.users = [] // Error: Cannot assign to 'users'

  // 불변 업데이트: 새로운 객체를 반환
  return {
    ...state,
    users: [...state.users, { id: 99, name: 'NewUser' }],
  }
}
```

**개선 효과**:
- 의도치 않은 상태 변경을 컴파일 시점에 차단
- 데이터 흐름이 명확해져 디버깅 용이
- 불변 패턴을 자연스럽게 강제하여 부작용 감소

#### 3-3. Interface Segregation Principle (ISP)

**Before** (나쁜 예):
```typescript
// 거대한 인터페이스: 모든 기능을 하나에 포함
interface Animal {
  name: string
  fly(): void
  swim(): void
  run(): void
  bark(): void
  meow(): void
  layEggs(): void
}

// 모든 구현체가 불필요한 메서드를 구현해야 함
class Dog implements Animal {
  name = 'Dog'
  fly() { throw new Error('Dogs cannot fly') }
  swim() { console.log('Swimming') }
  run() { console.log('Running') }
  bark() { console.log('Woof!') }
  meow() { throw new Error('Dogs do not meow') }
  layEggs() { throw new Error('Dogs do not lay eggs') }
}
```

**문제점**:
- 구현체가 불필요한 메서드를 강제로 구현해야 함
- 런타임에 `throw new Error`로 처리하면 타입 안전성 손실
- 인터페이스 변경 시 모든 구현체에 영향

**After** (좋은 예):
```typescript
// 역할별로 인터페이스 분리
interface Nameable {
  name: string
}

interface Flyable {
  fly(): void
}

interface Swimmable {
  swim(): void
}

interface Runnable {
  run(): void
}

interface Barkable {
  bark(): void
}

// 필요한 인터페이스만 조합
class Dog implements Nameable, Swimmable, Runnable, Barkable {
  name = 'Dog'
  swim() { console.log('Swimming') }
  run() { console.log('Running') }
  bark() { console.log('Woof!') }
}

class Eagle implements Nameable, Flyable {
  name = 'Eagle'
  fly() { console.log('Soaring') }
}

// 타입으로 조합하여 함수 파라미터에 활용
function race(participants: (Runnable & Nameable)[]) {
  participants.forEach((p) => {
    console.log(`${p.name} starts!`)
    p.run()
  })
}
```

**개선 효과**:
- 각 구현체가 실제로 지원하는 기능만 구현
- 불필요한 메서드 구현(`throw new Error`)이 사라짐
- 인터페이스 조합으로 유연한 타입 설계 가능

#### 3-4. 타입 vs 인터페이스 선택 기준

**가이드라인**:

```typescript
// interface 사용: 객체 형태 정의, 확장(extends) 필요, 선언 병합 필요
interface UserService {
  getUser(id: number): Promise<User>
  createUser(data: CreateUserInput): Promise<User>
}

// 선언 병합 (라이브러리 타입 확장 시 유용)
interface Window {
  analytics: AnalyticsSDK
}

// 상속
interface AdminService extends UserService {
  deleteUser(id: number): Promise<void>
}


// type 사용: 유니온, 인터섹션, 조건부 타입, 리터럴 타입, 매핑 타입
type Status = 'pending' | 'active' | 'inactive'

type Result<T> = { success: true; data: T } | { success: false; error: string }

type Nullable<T> = T | null

type EventHandler = (event: Event) => void

// 조건부 타입
type IsArray<T> = T extends Array<unknown> ? true : false

// 매핑 타입
type Mutable<T> = { -readonly [P in keyof T]: T[P] }
```

**선택 기준 요약**:

| 상황 | 추천 | 이유 |
|------|------|------|
| 객체 형태 정의 | `interface` | 확장성, 선언 병합 지원 |
| 유니온/인터섹션 타입 | `type` | `interface`로 표현 불가 |
| 함수 타입 | `type` | 더 간결한 문법 |
| 라이브러리 타입 확장 | `interface` | 선언 병합 필요 |
| 조건부/매핑 타입 | `type` | `interface`로 표현 불가 |
| 클래스 구현 계약 | `interface` | `implements` 키워드 사용 |

---

## 4. 열거형과 상수 (Enums & Constants)

### 검토 항목

- [ ] 숫자형 `enum`이 사용되고 있는가? (의도치 않은 역방향 매핑 주의)
- [ ] `enum` 대신 `as const`나 리터럴 유니온으로 대체 가능한가?
- [ ] 상수 값이 매직 넘버/문자열로 하드코딩되어 있는가?
- [ ] 상수 객체의 타입이 적절히 좁혀져 있는가?
- [ ] `const enum`의 트레이드오프를 이해하고 사용하는가?

### 개선 패턴

#### 4-1. `as const` 활용

**Before** (나쁜 예):
```typescript
// 숫자형 enum: 역방향 매핑으로 인한 혼동
enum Direction {
  Up,    // 0
  Down,  // 1
  Left,  // 2
  Right, // 3
}

// 유효하지 않은 값도 할당 가능
const dir: Direction = 99 // 에러 없음!

// 문자열 enum: Tree-shaking 불가
enum HttpStatus {
  OK = 'OK',
  NotFound = 'NOT_FOUND',
  ServerError = 'SERVER_ERROR',
}

// 설정 객체: 타입이 넓게 추론됨
const config = {
  maxRetries: 3,
  timeout: 5000,
  baseUrl: 'https://api.example.com',
}
// typeof config.maxRetries -> number (3이 아님)
// typeof config.baseUrl -> string ('https://api.example.com'이 아님)
```

**After** (좋은 예):
```typescript
// as const로 리터럴 타입 보존
const Direction = {
  Up: 'UP',
  Down: 'DOWN',
  Left: 'LEFT',
  Right: 'RIGHT',
} as const

type Direction = (typeof Direction)[keyof typeof Direction]
// 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

// 유효한 값만 할당 가능
const dir: Direction = 'UP' // OK
// const invalid: Direction = 'DIAGONAL' // Error

// HTTP 상태 코드
const HttpStatus = {
  OK: 200,
  NotFound: 404,
  ServerError: 500,
} as const

type HttpStatus = (typeof HttpStatus)[keyof typeof HttpStatus]
// 200 | 404 | 500

// 설정 객체: 리터럴 타입으로 좁혀짐
const config = {
  maxRetries: 3,
  timeout: 5000,
  baseUrl: 'https://api.example.com',
} as const

// typeof config.maxRetries -> 3
// typeof config.baseUrl -> 'https://api.example.com'
```

**개선 효과**:
- `as const`는 Tree-shaking이 가능하여 번들 크기 최적화
- 리터럴 타입으로 좁혀져 더 정확한 타입 검사 가능
- 런타임 객체와 타입을 동시에 정의하여 중복 제거

#### 4-2. 리터럴 유니온 타입 vs enum

**Before** (나쁜 예):
```typescript
// 단순한 문자열 집합에 enum 사용: 과도한 추상화
enum Color {
  Red = 'RED',
  Green = 'GREEN',
  Blue = 'BLUE',
}

enum Size {
  Small = 'SMALL',
  Medium = 'MEDIUM',
  Large = 'LARGE',
}

function paintWidget(color: Color, size: Size) {
  // enum 값에 접근하려면 항상 Color.Red 형태
  console.log(`Painting ${color} widget of size ${size}`)
}

// 호출 시 enum import 필요
paintWidget(Color.Red, Size.Large)
```

**After** (좋은 예):
```typescript
// 리터럴 유니온: 단순하고 직관적
type Color = 'RED' | 'GREEN' | 'BLUE'
type Size = 'SMALL' | 'MEDIUM' | 'LARGE'

function paintWidget(color: Color, size: Size) {
  console.log(`Painting ${color} widget of size ${size}`)
}

// 호출 시 문자열 리터럴 직접 사용 (import 불필요)
paintWidget('RED', 'LARGE')

// 값 목록이 필요한 경우: as const 활용
const COLORS = ['RED', 'GREEN', 'BLUE'] as const
type Color2 = (typeof COLORS)[number]

// 런타임 검증에도 활용 가능
function isValidColor(value: string): value is Color2 {
  return (COLORS as readonly string[]).includes(value)
}
```

**개선 효과**:
- 코드가 단순해지고 import 필요성 감소
- 런타임에 추가 코드가 생성되지 않음 (enum은 객체로 변환됨)
- JSON 직렬화/역직렬화에서 자연스럽게 동작

#### 4-3. 상수 객체 패턴

**Before** (나쁜 예):
```typescript
// 매직 넘버와 매직 문자열 사용
function calculateShipping(weight: number, destination: string): number {
  if (destination === 'domestic') {
    if (weight <= 1) return 3000
    if (weight <= 5) return 5000
    return 8000
  }
  if (destination === 'international') {
    if (weight <= 1) return 15000
    if (weight <= 5) return 25000
    return 40000
  }
  return 0
}

// 다른 파일에서 동일 상수를 중복 정의
const DOMESTIC_BASE_FEE = 3000 // 여기도 3000
const DOMESTIC_BASE_FEE_2 = 3000 // 저기도 3000
```

**After** (좋은 예):
```typescript
const SHIPPING = {
  destinations: {
    DOMESTIC: 'domestic',
    INTERNATIONAL: 'international',
  },
  weightThresholds: {
    LIGHT: 1,
    MEDIUM: 5,
  },
  fees: {
    domestic: {
      light: 3_000,
      medium: 5_000,
      heavy: 8_000,
    },
    international: {
      light: 15_000,
      medium: 25_000,
      heavy: 40_000,
    },
  },
} as const

type Destination = (typeof SHIPPING.destinations)[keyof typeof SHIPPING.destinations]

function getWeightCategory(weight: number) {
  if (weight <= SHIPPING.weightThresholds.LIGHT) return 'light' as const
  if (weight <= SHIPPING.weightThresholds.MEDIUM) return 'medium' as const
  return 'heavy' as const
}

function calculateShipping(weight: number, destination: Destination): number {
  const category = getWeightCategory(weight)
  return SHIPPING.fees[destination][category]
}
```

**개선 효과**:
- 매직 넘버를 의미 있는 이름으로 대체하여 가독성 향상
- 상수를 한 곳에서 관리하여 변경 시 일관성 보장
- 타입 시스템과 통합되어 유효하지 않은 값 사용 방지

---

## 5. 에러 처리 (Error Handling)

### 검토 항목

- [ ] `catch` 절에서 `error`를 `unknown` 타입으로 처리하는가? (TypeScript 4.4+)
- [ ] 에러 정보를 무시하지 않고 적절히 처리하는가? (빈 `catch` 블록 주의)
- [ ] 비즈니스 로직의 성공/실패를 `throw` 대신 반환 값으로 표현하는가?
- [ ] 커스텀 에러 클래스가 적절한 컨텍스트 정보를 포함하는가?
- [ ] 에러 메시지가 디버깅에 충분한 정보를 제공하는가?
- [ ] 예상 가능한 에러와 예상 불가능한 에러를 구분하는가?

### 개선 패턴

#### 5-1. `unknown` 타입 catch

**Before** (나쁜 예):
```typescript
async function fetchData(url: string) {
  try {
    const response = await fetch(url)
    return await response.json()
  } catch (error) {
    // error가 any 타입으로 추론됨 (tsconfig strict 모드 아닌 경우)
    console.error(error.message) // error가 Error 인스턴스가 아닐 수도 있음
    throw new Error(`Fetch failed: ${error.message}`)
  }
}

// catch에서 에러를 무시하는 안티패턴
try {
  riskyOperation()
} catch (e) {
  // 아무것도 안 함 - 에러가 삼켜짐
}
```

**After** (좋은 예):
```typescript
// 에러 메시지 추출 헬퍼 함수
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unknown error occurred'
}

async function fetchData(url: string) {
  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error: unknown) {
    const message = getErrorMessage(error)
    console.error(`Failed to fetch ${url}:`, message)
    throw new Error(`Fetch failed for ${url}: ${message}`)
  }
}

// 의도적으로 에러를 무시하는 경우, 이유를 명시
try {
  loadOptionalPlugin()
} catch (_error: unknown) {
  // 플러그인 로드 실패는 애플리케이션 동작에 영향 없음
  // 사용자에게 알릴 필요도 없는 선택적 기능
}
```

**개선 효과**:
- `unknown` 타입으로 안전한 에러 처리 강제
- 에러 타입별 적절한 처리 로직 분기
- 에러를 무시하는 경우에도 의도를 명시적으로 기록

#### 5-2. Result 패턴 (성공/실패 구분)

**Before** (나쁜 예):
```typescript
// throw로 제어 흐름 관리 - 호출자가 try-catch를 잊으면 크래시
function validateEmail(email: string): string {
  if (!email.includes('@')) {
    throw new Error('Invalid email format')
  }
  if (email.length > 254) {
    throw new Error('Email too long')
  }
  return email.toLowerCase()
}

function validateAge(age: number): number {
  if (age < 0 || age > 150) {
    throw new Error('Invalid age')
  }
  return age
}

// 호출자: try-catch를 잊기 쉬움
function registerUser(email: string, age: number) {
  const validEmail = validateEmail(email) // throw 가능
  const validAge = validateAge(age) // throw 가능
  // throw를 잊으면 런타임 크래시
}
```

**After** (좋은 예):
```typescript
// Result 타입 정의
type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E }

// 성공/실패를 반환 값으로 표현
function validateEmail(email: string): Result<string> {
  if (!email.includes('@')) {
    return { success: false, error: 'Invalid email format' }
  }
  if (email.length > 254) {
    return { success: false, error: 'Email too long' }
  }
  return { success: true, data: email.toLowerCase() }
}

function validateAge(age: number): Result<number> {
  if (age < 0 || age > 150) {
    return { success: false, error: 'Invalid age' }
  }
  return { success: true, data: age }
}

// 호출자: 컴파일러가 에러 처리를 강제
function registerUser(email: string, age: number): Result<{ email: string; age: number }> {
  const emailResult = validateEmail(email)
  if (!emailResult.success) {
    return emailResult // 에러 전파
  }

  const ageResult = validateAge(age)
  if (!ageResult.success) {
    return ageResult // 에러 전파
  }

  return {
    success: true,
    data: { email: emailResult.data, age: ageResult.data },
  }
}

// 사용 예
const result = registerUser('user@example.com', 25)
if (result.success) {
  console.log('Registered:', result.data.email)
} else {
  console.error('Registration failed:', result.error)
}
```

**개선 효과**:
- 함수 시그니처에 실패 가능성이 명시되어 호출자가 반드시 처리
- `try-catch` 누락으로 인한 크래시 방지
- 에러와 정상 데이터의 타입이 명확하게 구분됨

#### 5-3. 커스텀 에러 클래스

**Before** (나쁜 예):
```typescript
// 모든 에러가 동일한 Error 클래스: 구분 불가
async function createOrder(userId: number, productId: number) {
  const user = await findUser(userId)
  if (!user) {
    throw new Error('User not found')
  }

  const product = await findProduct(productId)
  if (!product) {
    throw new Error('Product not found')
  }

  if (product.stock <= 0) {
    throw new Error('Out of stock')
  }

  if (user.balance < product.price) {
    throw new Error('Insufficient balance')
  }

  // ...
}

// 호출자: 에러 메시지 문자열로 구분해야 함 (깨지기 쉬움)
try {
  await createOrder(1, 2)
} catch (error) {
  if ((error as Error).message === 'User not found') {
    // 404 응답
  } else if ((error as Error).message === 'Out of stock') {
    // 409 응답
  }
  // 에러 메시지가 변경되면 분기가 깨짐
}
```

**After** (좋은 예):
```typescript
// 에러 계층 구조 정의
class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, id: number | string) {
    super(`${resource} with id ${id} not found`, 'NOT_FOUND', 404, { resource, id })
  }
}

class BusinessRuleError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'BUSINESS_RULE_VIOLATION', 422, context)
  }
}

class InsufficientFundsError extends BusinessRuleError {
  constructor(required: number, available: number) {
    super(`Insufficient funds: required ${required}, available ${available}`, {
      required,
      available,
    })
  }
}

// 에러 사용
async function createOrder(userId: number, productId: number) {
  const user = await findUser(userId)
  if (!user) {
    throw new NotFoundError('User', userId)
  }

  const product = await findProduct(productId)
  if (!product) {
    throw new NotFoundError('Product', productId)
  }

  if (product.stock <= 0) {
    throw new BusinessRuleError('Out of stock', { productId, stock: product.stock })
  }

  if (user.balance < product.price) {
    throw new InsufficientFundsError(product.price, user.balance)
  }
}

// 호출자: instanceof로 안전하게 분기
try {
  await createOrder(1, 2)
} catch (error: unknown) {
  if (error instanceof NotFoundError) {
    res.status(error.statusCode).json({ code: error.code, message: error.message })
  } else if (error instanceof InsufficientFundsError) {
    res.status(error.statusCode).json({
      code: error.code,
      message: error.message,
      context: error.context,
    })
  } else if (error instanceof AppError) {
    res.status(error.statusCode).json({ code: error.code, message: error.message })
  } else {
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Unexpected error' })
  }
}
```

**개선 효과**:
- `instanceof`로 에러 타입을 안전하게 구분 (문자열 비교 제거)
- 에러에 구조화된 컨텍스트 정보 포함으로 디버깅 용이
- HTTP 상태 코드 매핑이 에러 클래스에 캡슐화되어 일관성 보장
- 에러 계층 구조로 공통 처리와 세부 처리 분리 가능

---

## 6. 모듈 구성 (Module Organization)

### 검토 항목

- [ ] Barrel export(`index.ts`)가 성능 문제를 유발하는가? (Tree-shaking 방해)
- [ ] 순환 의존성(Circular Dependency)이 존재하는가?
- [ ] 경로 별칭(`@/`)이 일관되게 설정되어 있는가?
- [ ] 모듈의 공개 API가 명확하게 정의되어 있는가?
- [ ] 내부 구현이 외부로 불필요하게 노출되고 있는가?
- [ ] 파일 하나에 너무 많은 export가 있는가?

### 개선 패턴

#### 6-1. Barrel export 패턴과 주의점

**Before** (나쁜 예):
```typescript
// src/components/index.ts - 모든 컴포넌트를 re-export
export { Header } from './Header'
export { Footer } from './Footer'
export { Sidebar } from './Sidebar'
export { Button } from './ui/Button'
export { Card } from './ui/Card'
export { Modal } from './ui/Modal'
export { Table } from './ui/Table'
export { Form } from './ui/Form'
// ... 100개 이상의 컴포넌트

// 사용처: Button 하나만 필요한데 모든 컴포넌트가 번들에 포함될 수 있음
import { Button } from '@/components'
```

**문제점**:
- 하나의 컴포넌트를 import해도 barrel 파일 전체가 로드됨
- Tree-shaking이 제대로 동작하지 않는 번들러에서 번들 크기 증가
- 순환 의존성 발생 가능성 증가
- 모듈 초기화 순서 문제 발생 가능

**After** (좋은 예):
```typescript
// 방법 1: 직접 import (가장 안전)
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

// 방법 2: 계층별 제한된 barrel export
// src/components/ui/index.ts - UI 컴포넌트만 묶음
export { Button } from './Button'
export { Card } from './Card'
export { Badge } from './Badge'

// src/components/layout/index.ts - 레이아웃 컴포넌트만 묶음
export { Header } from './Header'
export { Footer } from './Footer'
export { Sidebar } from './Sidebar'

// 사용처: 계층별로 명확하게 import
import { Button, Card } from '@/components/ui'
import { Header } from '@/components/layout'

// 방법 3: 타입만 re-export (성능 영향 없음)
// src/types/index.ts
export type { User } from './user'
export type { Order } from './order'
export type { Product } from './product'
```

**개선 효과**:
- 불필요한 모듈 로딩을 방지하여 번들 크기 최적화
- 모듈 의존 관계가 명확해져 순환 의존성 감소
- import 경로에서 모듈의 카테고리를 즉시 파악 가능

#### 6-2. 순환 의존성 탐지와 해결

**Before** (나쁜 예):
```typescript
// user.ts
import { Order } from './order'

export interface User {
  id: number
  name: string
  orders: Order[] // Order에 의존
}

export function getUserDisplayName(user: User): string {
  return `${user.name} (${user.orders.length} orders)`
}

// order.ts
import { User } from './user' // 순환 의존!

export interface Order {
  id: number
  amount: number
  buyer: User // User에 의존
}

export function getOrderSummary(order: Order): string {
  return `Order #${order.id} by ${order.buyer.name}: ${order.amount}`
}
```

**문제점**:
- `user.ts` -> `order.ts` -> `user.ts` 순환 참조
- 모듈 초기화 시점에 `undefined` 참조 가능
- 번들러에 따라 런타임 에러 발생

**After** (좋은 예):
```typescript
// types.ts - 공유 타입을 별도 모듈로 추출
export interface User {
  id: number
  name: string
  orders: Order[]
}

export interface Order {
  id: number
  amount: number
  buyer: User
}

// user-utils.ts - User 관련 로직
import { User } from './types'

export function getUserDisplayName(user: User): string {
  return `${user.name} (${user.orders.length} orders)`
}

// order-utils.ts - Order 관련 로직
import { Order } from './types'

export function getOrderSummary(order: Order): string {
  return `Order #${order.id} by ${order.buyer.name}: ${order.amount}`
}

// 또는 참조 방향을 단방향으로 변경
// user.ts
export interface User {
  id: number
  name: string
}

// order.ts
import { User } from './user' // 단방향 의존

export interface Order {
  id: number
  amount: number
  buyerId: number // 객체 참조 대신 ID 참조
}

// user-with-orders.ts - 조합이 필요한 경우 별도 모듈
import { User } from './user'
import { Order } from './order'

export interface UserWithOrders extends User {
  orders: Order[]
}
```

**개선 효과**:
- 순환 의존성 제거로 모듈 초기화 문제 해결
- 공유 타입을 별도 모듈로 분리하여 의존 방향 단순화
- 각 모듈의 책임이 명확해져 유지보수 용이

#### 6-3. 경로 별칭 (Path Aliases)

**Before** (나쁜 예):
```typescript
// 깊은 상대 경로: 파일 위치 변경 시 모든 import 수정 필요
import { Button } from '../../../../components/ui/Button'
import { User } from '../../../types/user'
import { formatDate } from '../../../../lib/utils'
import { useAuth } from '../../../../hooks/useAuth'
import { API_BASE_URL } from '../../../../constants/api'
```

**After** (좋은 예):
```typescript
// tsconfig.json 경로 별칭 설정
// {
//   "compilerOptions": {
//     "baseUrl": ".",
//     "paths": {
//       "@/*": ["src/*"],
//       "@components/*": ["src/components/*"],
//       "@lib/*": ["src/lib/*"],
//       "@types/*": ["src/types/*"],
//       "@hooks/*": ["src/hooks/*"]
//     }
//   }
// }

// 경로 별칭 사용: 파일 위치와 무관하게 일관된 경로
import { Button } from '@/components/ui/Button'
import { User } from '@/types/user'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { API_BASE_URL } from '@/constants/api'
```

**개선 효과**:
- 파일 이동/리팩토링 시 import 경로 변경 최소화
- 모든 파일에서 동일한 경로 규칙 적용으로 일관성 확보
- 모듈의 위치를 절대 경로로 직관적 파악 가능

---

## 7. 통합 체크리스트

코드 리뷰 시 다음 체크리스트를 순서대로 검토합니다.

### High Priority (즉시 수정)

| 카테고리 | 검토 항목 | 우선순위 |
|----------|----------|----------|
| 타입 안전성 | `any` 타입이 공개 API에 사용되는가? | **High** |
| 타입 안전성 | `@ts-ignore`가 정당한 이유 없이 사용되는가? | **High** |
| 타입 안전성 | 타입 가드 없이 `as` 단언이 남용되는가? | **High** |
| 에러 처리 | `catch` 절에서 에러를 무시(빈 catch)하는가? | **High** |
| 에러 처리 | `catch(error)`가 `unknown`이 아닌 `any`로 처리되는가? | **High** |
| 모듈 구성 | 순환 의존성이 존재하는가? | **High** |
| 인터페이스 설계 | 유니온 타입을 안전하게(Discriminated Union) 처리하지 않는가? | **High** |

### Medium Priority (다음 리팩토링)

| 카테고리 | 검토 항목 | 우선순위 |
|----------|----------|----------|
| 타입 안전성 | Optional Chaining과 Nullish Coalescing을 활용하는가? | **Medium** |
| 타입 안전성 | 공개 함수의 반환 타입이 명시되어 있는가? | **Medium** |
| 제네릭 | 제네릭에 적절한 제약 조건이 있는가? | **Medium** |
| 제네릭 | 유틸리티 타입으로 대체 가능한 커스텀 타입이 있는가? | **Medium** |
| 인터페이스 설계 | 변경되면 안 되는 데이터에 `readonly`를 사용하는가? | **Medium** |
| 인터페이스 설계 | 인터페이스가 너무 큰가? (ISP 위반) | **Medium** |
| 에러 처리 | 예상 가능한 에러에 Result 패턴을 사용하는가? | **Medium** |
| 에러 처리 | 커스텀 에러 클래스에 충분한 컨텍스트가 있는가? | **Medium** |
| 열거형/상수 | 매직 넘버/문자열이 상수로 정의되어 있는가? | **Medium** |
| 모듈 구성 | Barrel export가 성능 문제를 유발하는가? | **Medium** |

### Low Priority (시간 여유 시)

| 카테고리 | 검토 항목 | 우선순위 |
|----------|----------|----------|
| 제네릭 | 불필요한 제네릭(한 곳에서만 사용)이 있는가? | **Low** |
| 제네릭 | 제네릭이 과도하게 복잡한가? (3단계 이상 중첩) | **Low** |
| 인터페이스 설계 | `type`과 `interface` 선택이 적절한가? | **Low** |
| 열거형/상수 | `enum` 대신 `as const`나 리터럴 유니온을 사용하는가? | **Low** |
| 모듈 구성 | 경로 별칭이 일관되게 사용되는가? | **Low** |
| 모듈 구성 | 내부 구현이 불필요하게 외부로 노출되는가? | **Low** |

---

## 리뷰 순서 가이드

TypeScript 코드 리뷰 시 권장하는 검토 순서:

1. **타입 안전성**: `any` 사용 여부, 타입 단언 남용, null 처리 확인
2. **에러 처리**: `unknown` catch, 에러 무시 여부, 에러 타입 구조 확인
3. **모듈 구성**: 순환 의존성, barrel export 구조 확인
4. **인터페이스/타입 설계**: Discriminated Union, readonly, ISP 확인
5. **제네릭**: 제약 조건, 유틸리티 타입 활용, 복잡도 확인
6. **열거형/상수**: `as const` 활용, 매직 넘버 여부 확인

---

## Before/After 제공 가이드

모든 TypeScript 관련 제안은 다음 형식으로 제공합니다:

```markdown
**Before** (문제점):
[코드 예시 - 문제가 있는 코드]

**문제점**:
- 구체적인 타입 안전성/설계 문제 설명
- 런타임에 발생할 수 있는 위험 요소

**After** (개선안):
[개선된 코드 - 타입 시스템을 올바르게 활용]

**개선 효과**:
- 컴파일 시점 안전성 향상
- 런타임 에러 방지
- 유지보수성/가독성 개선
```

---

**이 가이드를 활용하여 TypeScript의 타입 시스템을 최대한 활용하는 안전한 코드를 작성하세요!**
