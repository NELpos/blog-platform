# JavaScript 코드 리뷰 가이드

## 목차
- 개요
- 1. 모던 ES 패턴 (Modern ES Patterns)
- 2. 비동기 처리 (Async Patterns)
- 3. 모듈 시스템 (Module System)
- 4. 배열/객체 메서드 (Array & Object Methods)
- 5. 에러 처리 (Error Handling)
- 6. 통합 체크리스트
- Before/After 제공 가이드


## 개요

**JavaScript 코드 리뷰 가이드**는 Tidy First 원칙과 Modern Software Engineering 관점에서 JavaScript 코드를 리뷰할 때 참고하는 언어별 가이드입니다. 모던 ES 패턴, 비동기 처리, 모듈 시스템, 함수형 메서드, 에러 처리의 5가지 영역을 다루며, 각 영역별 체크리스트와 Before/After 예시를 제공합니다.

**5가지 핵심 영역**:
1. **모던 ES 패턴** - const/let, 구조분해, Optional Chaining, Template Literals
2. **비동기 처리** - async/await, Promise 조합, 에러 처리
3. **모듈 시스템** - ESM vs CJS, Named/Default export, 동적 import
4. **배열/객체 메서드** - 함수형 패턴, 불변성, 선택 기준
5. **에러 처리** - 전역 핸들링, 커스텀 Error, 의미 있는 메시지

---

## 1. 모던 ES 패턴 (Modern ES Patterns)

### 검토 항목

1. `var` 대신 `const`/`let`을 사용하고 있는가?
2. 구조분해 할당을 활용하여 불필요한 중간 변수를 제거했는가?
3. Optional Chaining(`?.`)으로 깊은 null 체크 중첩을 해소했는가?
4. Nullish Coalescing(`??`)으로 `||`의 falsy 오류를 방지했는가?
5. Template Literals로 문자열 연결의 가독성을 높였는가?
6. 재할당이 없는 변수에 `let`이 아닌 `const`를 사용하는가?

### 개선 패턴

#### 예시 1: const/let 사용 및 구조분해 할당

**Before** (나쁜 예):
```javascript
var config = getConfig();
var host = config.server.host;
var port = config.server.port;
var timeout = config.server.timeout;

var url = 'https://' + host + ':' + port + '/api';

for (var i = 0; i < items.length; i++) {
  var item = items[i];
  var name = item.name;
  var price = item.price;
  console.log(name + ': ' + price + '원');
}
```

**문제점**:
- `var`는 함수 스코프로 의도치 않은 변수 호이스팅 발생
- 중간 변수가 많아 코드가 장황함
- 문자열 연결(`+`)은 복잡해질수록 가독성 저하
- `for` 루프의 `var i`가 루프 밖에서도 접근 가능

**After** (좋은 예):
```javascript
const config = getConfig();
const { host, port, timeout } = config.server;

const url = `https://${host}:${port}/api`;

for (const item of items) {
  const { name, price } = item;
  console.log(`${name}: ${price}원`);
}
```

**개선 효과**:
- `const`로 재할당 방지, 의도가 명확해짐
- 구조분해로 중간 변수 제거, 코드 간결화
- Template Literals로 문자열 조합의 가독성 향상
- 블록 스코프로 변수 누출 방지

#### 예시 2: Optional Chaining과 Nullish Coalescing

**Before** (나쁜 예):
```javascript
function getUserDisplayName(user) {
  let displayName;

  if (user && user.profile && user.profile.displayName) {
    displayName = user.profile.displayName;
  } else {
    displayName = 'Anonymous';
  }

  // 주의: 0이나 ''도 falsy로 취급됨
  const itemCount = user && user.cart && user.cart.count || 10;
  const bio = user && user.profile && user.profile.bio || 'No bio';

  return { displayName, itemCount, bio };
}
```

**문제점**:
- 중첩된 null 체크로 코드가 장황함
- `||` 연산자가 `0`, `''`, `false` 등 falsy 값을 의도치 않게 덮어씀
- `user.cart.count`가 `0`이면 기본값 `10`이 할당되는 버그 발생

**After** (좋은 예):
```javascript
function getUserDisplayName(user) {
  const displayName = user?.profile?.displayName ?? 'Anonymous';

  // ??는 null/undefined만 체크하므로 0, '', false는 유지됨
  const itemCount = user?.cart?.count ?? 10;
  const bio = user?.profile?.bio ?? 'No bio';

  return { displayName, itemCount, bio };
}
```

**개선 효과**:
- Optional Chaining으로 깊은 null 체크를 한 줄로 표현
- Nullish Coalescing으로 `null`/`undefined`만 정확히 처리
- `0`, `''`, `false` 등 유효한 falsy 값이 보존됨
- 코드량 60% 이상 감소

---

## 2. 비동기 처리 (Async Patterns)

### 검토 항목

1. 콜백 기반 코드를 async/await로 전환할 수 있는가?
2. Promise chain이 3단계 이상 중첩되지 않는가?
3. 병렬 실행 가능한 비동기 작업에 `Promise.all`을 사용하는가?
4. 부분 실패를 허용해야 하는 경우 `Promise.allSettled`를 사용하는가?
5. async 함수에 적절한 try/catch 에러 처리가 있는가?
6. unhandled promise rejection이 발생하지 않는가?

### 개선 패턴

#### 예시 1: 콜백 지옥에서 async/await로

**Before** (나쁜 예):
```javascript
function processOrder(orderId, callback) {
  getOrder(orderId, (err, order) => {
    if (err) {
      callback(err);
      return;
    }
    validateStock(order.items, (err, stockResult) => {
      if (err) {
        callback(err);
        return;
      }
      chargePayment(order.userId, order.total, (err, paymentResult) => {
        if (err) {
          callback(err);
          return;
        }
        sendConfirmationEmail(order.userId, (err, emailResult) => {
          if (err) {
            callback(err);
            return;
          }
          callback(null, {
            order,
            payment: paymentResult,
            email: emailResult,
          });
        });
      });
    });
  });
}
```

**문제점**:
- 콜백이 4단계 중첩되어 가독성 매우 낮음
- 에러 처리 코드가 반복됨
- 중간 단계에서 에러 발생 시 흐름 추적 어려움
- 디버깅 시 콜 스택 파악 곤란

**After** (좋은 예):
```javascript
async function processOrder(orderId) {
  const order = await getOrder(orderId);
  await validateStock(order.items);
  const paymentResult = await chargePayment(order.userId, order.total);
  const emailResult = await sendConfirmationEmail(order.userId);

  return {
    order,
    payment: paymentResult,
    email: emailResult,
  };
}
```

**개선 효과**:
- 동기 코드처럼 위에서 아래로 읽을 수 있음
- 중첩 완전히 제거, 인지 부하 대폭 감소
- try/catch로 에러를 한 곳에서 처리 가능
- 디버깅 시 스택 트레이스가 명확함

#### 예시 2: 순차 실행 vs 병렬 실행

**Before** (나쁜 예):
```javascript
async function loadDashboard(userId) {
  // 서로 의존성이 없는 작업을 순차 실행 (불필요한 대기)
  const user = await fetchUser(userId);
  const notifications = await fetchNotifications(userId);
  const analytics = await fetchAnalytics(userId);
  const recentOrders = await fetchRecentOrders(userId);

  return { user, notifications, analytics, recentOrders };
}
```

**문제점**:
- 4개의 독립적인 API 호출을 순차 실행
- 각 호출이 300ms라면 총 1200ms 소요
- 사용자 경험 저하

**After** (좋은 예):
```javascript
async function loadDashboard(userId) {
  // 독립적인 작업은 병렬 실행
  const [user, notifications, analytics, recentOrders] = await Promise.all([
    fetchUser(userId),
    fetchNotifications(userId),
    fetchAnalytics(userId),
    fetchRecentOrders(userId),
  ]);

  return { user, notifications, analytics, recentOrders };
}
```

**개선 효과**:
- 4개 API를 병렬 실행하여 총 300ms로 단축 (75% 개선)
- 구조분해 할당으로 결과를 명확하게 매핑
- 하나라도 실패하면 전체 실패 (엄격한 일관성)

#### 예시 3: Promise.allSettled로 부분 실패 허용

**Before** (나쁜 예):
```javascript
async function sendBulkNotifications(userIds) {
  try {
    // 한 명이라도 실패하면 전체가 실패
    const results = await Promise.all(
      userIds.map((id) => sendNotification(id))
    );
    return { success: true, results };
  } catch (error) {
    // 어떤 사용자가 실패했는지 알 수 없음
    return { success: false, error: error.message };
  }
}
```

**After** (좋은 예):
```javascript
async function sendBulkNotifications(userIds) {
  const results = await Promise.allSettled(
    userIds.map((id) => sendNotification(id))
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled');
  const failed = results.filter((r) => r.status === 'rejected');

  return {
    total: userIds.length,
    succeeded: succeeded.length,
    failed: failed.length,
    errors: failed.map((r) => r.reason.message),
  };
}
```

**개선 효과**:
- 부분 실패 시에도 성공한 결과를 활용 가능
- 실패한 항목을 정확히 식별하여 재시도 가능
- 사용자에게 상세한 결과 리포트 제공

---

## 3. 모듈 시스템 (Module System)

### 검토 항목

1. ESM(`import`/`export`)을 기본으로 사용하고 있는가?
2. CJS(`require`)를 사용한다면 명확한 이유가 있는가?
3. Named export를 기본으로 사용하고, Default export의 남용을 피하는가?
4. 배럴 파일(`index.js`)이 과도한 re-export로 번들 크기를 키우지 않는가?
5. 동적 import를 활용하여 초기 로드 성능을 최적화하는가?
6. 순환 의존(circular dependency)이 발생하지 않는가?

### 개선 패턴

#### 예시 1: Named Export vs Default Export

**Before** (나쁜 예):
```javascript
// utils.js - default export로 모든 것을 내보냄
const formatDate = (date) => { /* ... */ };
const formatCurrency = (amount) => { /* ... */ };
const formatPhoneNumber = (phone) => { /* ... */ };
const parseQueryString = (qs) => { /* ... */ };

export default {
  formatDate,
  formatCurrency,
  formatPhoneNumber,
  parseQueryString,
};

// 사용처 - 전체를 import해야 함 (tree-shaking 불가)
import utils from './utils.js';
utils.formatDate(new Date());
```

**문제점**:
- Default export 객체는 tree-shaking이 불가능
- `formatDate`만 필요해도 전체 모듈이 번들에 포함됨
- IDE의 자동 import/리네임 지원이 약함
- import 시 이름을 자유롭게 바꿀 수 있어 일관성 저하

**After** (좋은 예):
```javascript
// utils.js - named export로 개별 내보냄
export const formatDate = (date) => { /* ... */ };
export const formatCurrency = (amount) => { /* ... */ };
export const formatPhoneNumber = (phone) => { /* ... */ };
export const parseQueryString = (qs) => { /* ... */ };

// 사용처 - 필요한 것만 import (tree-shaking 가능)
import { formatDate } from './utils.js';
formatDate(new Date());
```

**개선 효과**:
- Tree-shaking으로 사용하지 않는 코드가 번들에서 제거됨
- IDE의 자동 import, 리네임 리팩토링 완벽 지원
- import 문만으로 어떤 기능을 사용하는지 명확히 파악
- 모듈 간 의존성 그래프를 정적으로 분석 가능

#### 예시 2: 동적 Import 활용

**Before** (나쁜 예):
```javascript
// 앱 시작 시 모든 모듈을 즉시 로드
import { ChartLibrary } from './chart-library.js';       // 500KB
import { PDFGenerator } from './pdf-generator.js';       // 300KB
import { MarkdownEditor } from './markdown-editor.js';   // 200KB

function renderPage(pageType) {
  if (pageType === 'dashboard') {
    return ChartLibrary.render();
  }
  if (pageType === 'report') {
    return PDFGenerator.generate();
  }
  if (pageType === 'editor') {
    return MarkdownEditor.init();
  }
}
```

**문제점**:
- 앱 시작 시 1MB의 모듈을 모두 로드
- 사용자가 dashboard만 보더라도 PDF, Editor 모듈까지 로드
- 초기 로딩 시간 증가, TTI(Time to Interactive) 저하

**After** (좋은 예):
```javascript
async function renderPage(pageType) {
  if (pageType === 'dashboard') {
    const { ChartLibrary } = await import('./chart-library.js');
    return ChartLibrary.render();
  }
  if (pageType === 'report') {
    const { PDFGenerator } = await import('./pdf-generator.js');
    return PDFGenerator.generate();
  }
  if (pageType === 'editor') {
    const { MarkdownEditor } = await import('./markdown-editor.js');
    return MarkdownEditor.init();
  }
}
```

**개선 효과**:
- 필요한 시점에만 해당 모듈을 로드 (lazy loading)
- 초기 번들 크기 대폭 감소, TTI 개선
- 코드 스플리팅이 자연스럽게 적용됨
- 네트워크 대역폭 절약

#### 예시 3: ESM vs CJS 선택 기준

```javascript
// ESM (권장 - 브라우저/Node.js 16+ 표준)
import { readFile } from 'node:fs/promises';
export const processFile = async (path) => { /* ... */ };

// CJS (레거시 - Node.js 호환성 필요 시)
const { readFile } = require('fs/promises');
module.exports.processFile = async (path) => { /* ... */ };
```

**선택 기준**:
- 신규 프로젝트: ESM 사용
- 라이브러리: ESM + CJS 듀얼 패키지 (package.json의 `exports` 필드 활용)
- 레거시 Node.js 호환: CJS 유지하되, 마이그레이션 계획 수립

---

## 4. 배열/객체 메서드 (Array & Object Methods)

### 검토 항목

1. `for` 루프 대신 `map`, `filter`, `reduce` 등 선언적 메서드를 사용하는가?
2. 원본 배열/객체를 직접 변경(mutate)하지 않는가?
3. `reduce`가 과도하게 복잡하지 않은가? (가독성 우선)
4. Spread 연산자로 불변성을 유지하고 있는가?
5. `Object.entries`, `Object.fromEntries` 등 모던 메서드를 활용하는가?
6. 성능이 중요한 핫 패스에서 적절한 방법을 선택했는가?

### 개선 패턴

#### 예시 1: 명령형에서 선언형으로

**Before** (나쁜 예):
```javascript
function getActiveUserEmails(users) {
  const result = [];
  for (let i = 0; i < users.length; i++) {
    if (users[i].isActive) {
      if (users[i].email) {
        result.push(users[i].email.toLowerCase());
      }
    }
  }

  // 중복 제거
  const unique = [];
  for (let i = 0; i < result.length; i++) {
    if (unique.indexOf(result[i]) === -1) {
      unique.push(result[i]);
    }
  }

  // 정렬
  for (let i = 0; i < unique.length - 1; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      if (unique[i] > unique[j]) {
        const temp = unique[i];
        unique[i] = unique[j];
        unique[j] = temp;
      }
    }
  }

  return unique;
}
```

**문제점**:
- 명령형 코드로 "어떻게(how)" 하는지를 일일이 서술
- 의도 파악에 전체 코드를 읽어야 함
- 중간 변수가 많아 상태 추적 어려움
- 버블 정렬 직접 구현 (비효율적)

**After** (좋은 예):
```javascript
function getActiveUserEmails(users) {
  return [...new Set(
    users
      .filter((user) => user.isActive && user.email)
      .map((user) => user.email.toLowerCase())
  )].sort();
}
```

**개선 효과**:
- 선언적으로 "무엇을(what)" 하는지 명확히 표현
- 메서드 체이닝으로 데이터 변환 파이프라인 구성
- `Set`으로 중복 제거, 내장 `sort`로 정렬
- 30줄을 6줄로 축소, 의도가 즉시 파악됨

#### 예시 2: 불변성 유지

**Before** (나쁜 예):
```javascript
function updateUserSettings(user, newSettings) {
  // 원본 객체를 직접 변경 (위험)
  user.settings.theme = newSettings.theme;
  user.settings.language = newSettings.language;
  user.updatedAt = new Date();
  return user;
}

function addItemToCart(cart, item) {
  // 원본 배열을 직접 변경 (위험)
  cart.items.push(item);
  cart.total += item.price;
  return cart;
}
```

**문제점**:
- 원본 객체/배열을 직접 변경하여 예측 불가능한 부수효과 발생
- React 등 상태 관리에서 변경 감지 실패
- 변경 이전 상태로 되돌리기(undo) 불가능
- 여러 곳에서 같은 객체를 참조하면 의도치 않은 변경 전파

**After** (좋은 예):
```javascript
function updateUserSettings(user, newSettings) {
  return {
    ...user,
    settings: {
      ...user.settings,
      theme: newSettings.theme,
      language: newSettings.language,
    },
    updatedAt: new Date(),
  };
}

function addItemToCart(cart, item) {
  return {
    ...cart,
    items: [...cart.items, item],
    total: cart.total + item.price,
  };
}
```

**개선 효과**:
- 원본 객체가 변경되지 않아 부수효과 없음
- React, Redux 등에서 상태 변경을 정확히 감지
- 이전 상태를 보존하여 undo/redo, 시간 여행 디버깅 가능
- 함수가 순수해져 테스트 용이

#### 예시 3: reduce 남용 방지

**Before** (나쁜 예):
```javascript
// reduce로 모든 것을 한 번에 처리 (과도하게 복잡)
const result = orders.reduce((acc, order) => {
  if (order.status === 'completed') {
    const category = order.category;
    if (!acc[category]) {
      acc[category] = { count: 0, total: 0, items: [] };
    }
    acc[category].count += 1;
    acc[category].total += order.amount;
    acc[category].items.push(order.id);
  }
  return acc;
}, {});
```

**After** (좋은 예):
```javascript
// 단계별로 분리하여 의도를 명확히
const completedOrders = orders.filter(
  (order) => order.status === 'completed'
);

const result = Object.groupBy(completedOrders, (order) => order.category);

const summary = Object.fromEntries(
  Object.entries(result).map(([category, items]) => [
    category,
    {
      count: items.length,
      total: items.reduce((sum, order) => sum + order.amount, 0),
      items: items.map((order) => order.id),
    },
  ])
);
```

**개선 효과**:
- 각 단계의 의도가 명확히 드러남 (필터 -> 그룹화 -> 집계)
- 중간 결과를 디버깅하기 쉬움
- `Object.groupBy` 활용으로 그룹화 로직 단순화
- reduce의 누적기(accumulator) 복잡도 제거

---

## 5. 에러 처리 (Error Handling)

### 검토 항목

1. 에러를 무시(swallow)하지 않는가? (빈 catch 블록)
2. 에러 메시지에 디버깅에 필요한 컨텍스트가 포함되어 있는가?
3. 커스텀 Error 클래스로 에러 유형을 구분하는가?
4. 비동기 에러가 적절히 전파되는가?
5. 전역 에러 핸들러가 설정되어 있는가?
6. `throw`할 때 문자열이 아닌 Error 객체를 사용하는가?

### 개선 패턴

#### 예시 1: 의미 있는 에러 처리

**Before** (나쁜 예):
```javascript
async function fetchUserData(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    const data = await response.json();
    return data;
  } catch (e) {
    // 에러를 무시하거나 모호한 메시지
    console.log('error');
    return null;
  }
}

function parseConfig(raw) {
  try {
    return JSON.parse(raw);
  } catch (e) {
    // 문자열을 throw (스택 트레이스 없음)
    throw 'Config parsing failed';
  }
}
```

**문제점**:
- 빈 catch로 에러를 삼켜서 디버깅 불가
- `console.log('error')`는 어떤 에러인지 알 수 없음
- `return null`로 에러를 숨기면 호출자가 null 체크를 강제당함
- 문자열 throw는 스택 트레이스, `instanceof` 체크 불가

**After** (좋은 예):
```javascript
async function fetchUserData(userId) {
  const response = await fetch(`/api/users/${userId}`);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch user ${userId}: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

function parseConfig(raw) {
  try {
    return JSON.parse(raw);
  } catch (cause) {
    throw new Error('Config parsing failed: invalid JSON format', { cause });
  }
}
```

**개선 효과**:
- HTTP 상태 코드와 userId를 포함하여 디버깅 컨텍스트 제공
- `Error` 객체로 스택 트레이스 보존
- `{ cause }` 옵션으로 원인 에러를 체이닝
- 에러를 삼키지 않아 문제 발견이 빠름

#### 예시 2: 커스텀 Error 클래스

**Before** (나쁜 예):
```javascript
async function createOrder(orderData) {
  const user = await findUser(orderData.userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (user.balance < orderData.total) {
    throw new Error('Insufficient balance');
  }

  const stock = await checkStock(orderData.items);
  if (!stock.available) {
    throw new Error('Out of stock');
  }

  return processOrder(orderData);
}

// 호출자 - 에러 유형 구분 불가
try {
  await createOrder(data);
} catch (error) {
  // 문자열 비교로 에러 분기 (깨지기 쉬움)
  if (error.message === 'User not found') {
    showNotFoundPage();
  } else if (error.message === 'Insufficient balance') {
    showPaymentPage();
  } else {
    showErrorPage();
  }
}
```

**문제점**:
- 에러 메시지 문자열로 분기하여 오타에 취약
- 에러 메시지가 바뀌면 모든 분기 코드를 수정해야 함
- 에러에 추가 데이터(잔액, 재고 수량 등)를 담을 수 없음

**After** (좋은 예):
```javascript
class NotFoundError extends Error {
  constructor(resource, id) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.resourceId = id;
  }
}

class InsufficientBalanceError extends Error {
  constructor(required, available) {
    super(`Insufficient balance: required ${required}, available ${available}`);
    this.name = 'InsufficientBalanceError';
    this.required = required;
    this.available = available;
  }
}

class OutOfStockError extends Error {
  constructor(itemId, requested, available) {
    super(`Item ${itemId}: requested ${requested}, available ${available}`);
    this.name = 'OutOfStockError';
    this.itemId = itemId;
    this.requested = requested;
    this.available = available;
  }
}

async function createOrder(orderData) {
  const user = await findUser(orderData.userId);
  if (!user) {
    throw new NotFoundError('User', orderData.userId);
  }

  if (user.balance < orderData.total) {
    throw new InsufficientBalanceError(orderData.total, user.balance);
  }

  const stock = await checkStock(orderData.items);
  if (!stock.available) {
    throw new OutOfStockError(stock.itemId, stock.requested, stock.current);
  }

  return processOrder(orderData);
}

// 호출자 - instanceof로 안전하게 분기
try {
  await createOrder(data);
} catch (error) {
  if (error instanceof NotFoundError) {
    showNotFoundPage(error.resource, error.resourceId);
  } else if (error instanceof InsufficientBalanceError) {
    showPaymentPage(error.required, error.available);
  } else if (error instanceof OutOfStockError) {
    showStockAlert(error.itemId, error.available);
  } else {
    showErrorPage(error);
  }
}
```

**개선 효과**:
- `instanceof`로 타입 안전한 에러 분기
- 에러 메시지 변경이 분기 로직에 영향 없음
- 각 에러에 구조화된 추가 데이터 포함
- 에러를 자기 문서화(self-documenting)하여 디버깅 용이

#### 예시 3: 전역 에러 핸들링

**Before** (나쁜 예):
```javascript
// 전역 에러 핸들링 없음 - unhandled rejection 발생 시 앱 크래시
fetchData().then((data) => render(data));

button.addEventListener('click', () => {
  riskyOperation(); // 에러 발생 시 조용히 실패
});
```

**After** (좋은 예):
```javascript
// 전역 에러 핸들러 설정
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  errorTracker.capture(event.reason);
  showUserFriendlyError('예기치 않은 오류가 발생했습니다.');
});

window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
  errorTracker.capture(event.error);
  showUserFriendlyError('예기치 않은 오류가 발생했습니다.');
});

// Node.js 환경
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  errorTracker.capture(reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  errorTracker.capture(error);
  process.exit(1); // 프로세스 재시작 필요
});
```

**개선 효과**:
- 처리되지 않은 에러가 조용히 무시되지 않음
- 에러 추적 서비스에 자동 보고되어 모니터링 가능
- 사용자에게 친절한 에러 메시지 표시
- Node.js에서 프로세스 크래시를 감지하고 안전하게 종료

---

## 6. 통합 체크리스트

코드 리뷰 시 다음 표를 기준으로 우선순위에 따라 검토합니다:

| 카테고리 | 검토 항목 | 우선순위 |
|----------|-----------|----------|
| **에러 처리** | 빈 catch 블록 또는 에러를 삼키는 코드 | **High** |
| **에러 처리** | 문자열 throw 대신 Error 객체 사용 | **High** |
| **에러 처리** | 비동기 에러의 미처리 (unhandled rejection) | **High** |
| **비동기 처리** | 콜백 지옥 (3단계 이상 중첩) | **High** |
| **비동기 처리** | 병렬 가능한 작업의 순차 실행 | **High** |
| **모던 ES 패턴** | `var` 사용 | **High** |
| **배열/객체** | 원본 객체/배열 직접 변경 (mutation) | **High** |
| **모던 ES 패턴** | `||`로 기본값 할당 시 falsy 값 오류 | **Medium** |
| **모던 ES 패턴** | 깊은 null 체크 중첩 (Optional Chaining 미사용) | **Medium** |
| **비동기 처리** | 부분 실패 허용이 필요한 곳에서 Promise.all 사용 | **Medium** |
| **에러 처리** | 커스텀 Error 클래스 없이 문자열 메시지로 분기 | **Medium** |
| **모듈 시스템** | Default export 남용 (tree-shaking 불가) | **Medium** |
| **모듈 시스템** | 순환 의존성 (circular dependency) | **Medium** |
| **배열/객체** | 명령형 for 루프 대신 선언적 메서드 사용 가능 여부 | **Medium** |
| **배열/객체** | reduce의 과도한 복잡도 | **Medium** |
| **모던 ES 패턴** | 구조분해 할당으로 간소화 가능한 코드 | **Low** |
| **모던 ES 패턴** | 문자열 연결 대신 Template Literals 사용 | **Low** |
| **모듈 시스템** | 동적 import로 코드 스플리팅 가능한 구간 | **Low** |
| **모듈 시스템** | 배럴 파일의 과도한 re-export | **Low** |
| **에러 처리** | 전역 에러 핸들러 미설정 | **Low** |

### 우선순위 판단 기준

| 우선순위 | 기준 | 조치 |
|----------|------|------|
| **High** | 버그 유발 가능, 런타임 에러 위험, 성능에 직접 영향 | 즉시 수정 요청 |
| **Medium** | 유지보수성 저하, 잠재적 버그 가능성, 가독성 감소 | 이번 PR에서 수정 권장 |
| **Low** | 코드 스타일, 추가 최적화, 관례적 개선 | 다음 리팩토링에서 개선 |

---

## Before/After 제공 가이드

모든 리뷰 코멘트는 다음 형식을 따릅니다:

```markdown
**Before** (문제점):
[코드 예시]

**문제점**:
- 구체적인 문제 설명

**After** (개선안):
[개선된 코드]

**개선 효과**:
- 구체적인 개선 효과
```

### 핵심 원칙

1. **문제만 지적하지 말고 대안을 제시하라** - Before 없이 After만 제시하지 않음
2. **개선 효과를 정량적으로 설명하라** - "좋아짐" 대신 "번들 크기 30% 감소"
3. **우선순위를 명시하라** - 모든 항목이 같은 중요도가 아님
4. **Tidy First 관점을 유지하라** - 기능 변경 전에 코드를 먼저 정리

---

**이 가이드를 활용하여 JavaScript 코드의 품질을 체계적으로 개선하세요!**
