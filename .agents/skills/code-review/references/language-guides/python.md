# Python 코드 리뷰 가이드

## 목차
- 개요
- 1. 타입 힌트와 안전성 (Type Hints & Safety)
- 2. Pythonic 패턴 (Pythonic Patterns)
- 3. 에러 처리 (Error Handling)
- 4. 비동기 처리 (Async Patterns)
- 5. 모듈 구성 (Module Organization)
- 6. 데이터 클래스와 불변성 (Data Classes & Immutability)
- 7. 함수 설계 (Function Design)
- 8. 통합 체크리스트
- Before/After 제공 가이드


## 개요

**Python 코드 리뷰 가이드**는 Tidy First 원칙과 Modern Software Engineering 관점에서 Python 코드를 리뷰할 때 참고하는 언어별 가이드입니다. 타입 힌트, Pythonic 패턴, 에러 처리, 비동기 처리, 모듈 구성, 데이터 클래스/불변성, 함수 설계의 7가지 영역을 다루며, 각 영역별 체크리스트와 Before/After 예시를 제공합니다.

**7가지 핵심 영역**:
1. **타입 힌트와 안전성** - type hints, Union/Optional, Protocol, TypeGuard
2. **Pythonic 패턴** - 컴프리헨션, 제너레이터, 컨텍스트 매니저, 언패킹
3. **에러 처리** - 구체적 예외, 커스텀 예외, 예외 체이닝
4. **비동기 처리** - asyncio, async/await, 병렬 실행, 동기/비동기 분리
5. **모듈 구성** - 패키지 구조, 순환 임포트, __all__, 네임스페이스
6. **데이터 클래스와 불변성** - dataclass, NamedTuple, frozen, Pydantic
7. **함수 설계** - 가변 기본값, *args/**kwargs, 데코레이터, 클로저

---

## 1. 타입 힌트와 안전성 (Type Hints & Safety)

### 검토 항목

1. 공개 API(함수, 메서드)에 타입 힌트가 명시되어 있는가?
2. `Any` 타입이 남용되고 있는가?
3. `Optional[X]` 대신 `X | None` (Python 3.10+)을 사용하고 있는가?
4. `Union` 타입을 안전하게 분기 처리하는가?
5. `Protocol`로 구조적 서브타이핑을 활용하는가?
6. `TypeGuard`로 타입 좁히기를 수행하는가?
7. `cast()`가 정당한 이유 없이 사용되는가?

### 개선 패턴

#### 예시 1: 타입 힌트 누락과 Any 남용

**Before** (나쁜 예):
```python
from typing import Any


def parse_response(response):
    data = response["data"]
    users = []
    for item in data:
        users.append({
            "name": item["name"],
            "age": item["age"],
            "email": item["email"],
        })
    return users


def process_items(items: list[Any]) -> Any:
    result = {}
    for item in items:
        result[item.id] = item.value  # item의 구조를 알 수 없음
    return result
```

**문제점**:
- 타입 힌트 없이 함수 시그니처만으로 데이터 구조를 파악할 수 없음
- `Any`를 사용하면 타입 검사가 완전히 무력화됨
- IDE의 자동 완성, 리팩토링 지원 불가
- `mypy` 등 정적 분석 도구의 효용 상실

**After** (좋은 예):
```python
from dataclasses import dataclass


@dataclass
class UserDTO:
    name: str
    age: int
    email: str


@dataclass
class ApiResponse:
    data: list[dict[str, str | int]]
    status: int
    message: str


def parse_response(response: ApiResponse) -> list[UserDTO]:
    return [
        UserDTO(
            name=str(item["name"]),
            age=int(item["age"]),
            email=str(item["email"]),
        )
        for item in response.data
    ]


@dataclass
class Item:
    id: str
    value: float


def process_items(items: list[Item]) -> dict[str, float]:
    return {item.id: item.value for item in items}
```

**개선 효과**:
- 함수 시그니처만으로 입출력 데이터 구조를 즉시 파악
- `mypy`가 타입 불일치를 컴파일 시점에 감지
- IDE 자동 완성으로 개발 생산성 향상
- 코드 자체가 데이터 구조의 문서 역할

#### 예시 2: Union 타입의 안전한 분기 처리

**Before** (나쁜 예):
```python
def process_value(value):
    # 타입을 확인하지 않고 바로 사용
    return value.upper()  # value가 int면 AttributeError


def handle_result(result):
    if result["status"] == "success":
        return result["data"]
    else:
        print("에러 발생")
        return None  # 에러 정보를 삼킴
```

**문제점**:
- 타입 체크 없이 메서드를 호출하면 런타임 에러 발생
- 결과를 `None`으로 반환하면 호출자가 `None` 체크를 강제당함
- 에러 정보가 유실됨

**After** (좋은 예):
```python
from dataclasses import dataclass


@dataclass
class Success[T]:
    data: T


@dataclass
class Failure:
    error: str
    code: int


type Result[T] = Success[T] | Failure


def process_value(value: str | int) -> str:
    match value:
        case str():
            return value.upper()
        case int():
            return str(value)


def handle_result(result: Result[dict]) -> dict:
    match result:
        case Success(data=data):
            return data
        case Failure(error=error, code=code):
            raise ValueError(f"처리 실패 [{code}]: {error}")
```

**개선 효과**:
- `match` 문(Python 3.10+)으로 모든 타입 분기를 명시적 처리
- `mypy`가 누락된 분기를 감지 가능
- 에러 정보를 구조화하여 전달
- `None` 반환 대신 명시적 에러 전파

#### 예시 3: Protocol을 활용한 구조적 서브타이핑

**Before** (나쁜 예):
```python
from abc import ABC, abstractmethod


class Animal(ABC):
    @abstractmethod
    def speak(self) -> str:
        ...

    @abstractmethod
    def move(self) -> str:
        ...

    @abstractmethod
    def eat(self) -> str:
        ...


# Dog는 speak만 필요한데 move, eat도 구현해야 함
class Dog(Animal):
    def speak(self) -> str:
        return "멍멍!"

    def move(self) -> str:
        return "뛰기"

    def eat(self) -> str:
        return "사료 먹기"


def make_sound(animal: Animal) -> str:
    return animal.speak()  # speak만 필요하지만 Animal 전체를 요구
```

**문제점**:
- 거대한 추상 클래스에 모든 동작을 정의 (ISP 위반)
- 구현체가 불필요한 메서드까지 강제 구현
- 외부 라이브러리 클래스는 ABC를 상속할 수 없음 (명목적 타이핑의 한계)

**After** (좋은 예):
```python
from typing import Protocol, runtime_checkable


@runtime_checkable
class Speakable(Protocol):
    def speak(self) -> str: ...


class Movable(Protocol):
    def move(self) -> str: ...


class Dog:
    def speak(self) -> str:
        return "멍멍!"

    def move(self) -> str:
        return "뛰기"


class Robot:
    """외부 라이브러리 클래스 - ABC 상속 불필요"""
    def speak(self) -> str:
        return "삐빕!"


def make_sound(entity: Speakable) -> str:
    return entity.speak()


# Dog, Robot 모두 Speakable 프로토콜을 만족
make_sound(Dog())    # OK
make_sound(Robot())  # OK - ABC 상속 없이도 동작

# 런타임 체크도 가능
assert isinstance(Dog(), Speakable)
```

**개선 효과**:
- 역할별로 프로토콜을 분리하여 ISP 준수
- 구조적 서브타이핑으로 외부 클래스도 호환 가능
- `@runtime_checkable`로 런타임 타입 체크 지원
- 필요한 인터페이스만 요구하여 결합도 감소

---

## 2. Pythonic 패턴 (Pythonic Patterns)

### 검토 항목

1. `for` 루프 대신 리스트/딕셔너리/집합 컴프리헨션을 사용할 수 있는가?
2. 대용량 데이터 처리에 제너레이터를 사용하는가?
3. 리소스 관리에 `with` 문(컨텍스트 매니저)을 사용하는가?
4. 튜플 언패킹, `*args`/`**kwargs` 언패킹을 활용하는가?
5. `enumerate`, `zip`, `itertools`를 적절히 사용하는가?
6. EAFP(Easier to Ask Forgiveness than Permission) 패턴을 따르는가?
7. `walrus operator`(`:=`)를 가독성 있게 사용하는가? (Python 3.8+)

### 개선 패턴

#### 예시 1: 컴프리헨션과 선언적 패턴

**Before** (나쁜 예):
```python
def get_active_user_emails(users):
    result = []
    for i in range(len(users)):
        user = users[i]
        if user["is_active"]:
            if user.get("email"):
                email = user["email"].lower()
                if email not in result:
                    result.append(email)

    # 수동 정렬
    for i in range(len(result) - 1):
        for j in range(i + 1, len(result)):
            if result[i] > result[j]:
                result[i], result[j] = result[j], result[i]

    return result


def create_lookup_table(items):
    table = {}
    for item in items:
        key = item["category"]
        if key not in table:
            table[key] = []
        table[key].append(item)
    return table
```

**문제점**:
- `range(len(...))`은 Python에서 안티패턴
- 명령형 코드로 "어떻게(how)" 하는지를 일일이 서술
- 수동 정렬은 비효율적이고 가독성 저하
- 중복 제거를 `not in` 리스트 검색으로 수행 (O(n) 비용)
- `defaultdict` 대신 수동으로 키 존재 여부 확인

**After** (좋은 예):
```python
from collections import defaultdict


def get_active_user_emails(users: list[dict]) -> list[str]:
    return sorted({
        user["email"].lower()
        for user in users
        if user["is_active"] and user.get("email")
    })


def create_lookup_table(items: list[dict]) -> dict[str, list[dict]]:
    table: dict[str, list[dict]] = defaultdict(list)
    for item in items:
        table[item["category"]].append(item)
    return dict(table)
```

**개선 효과**:
- 집합 컴프리헨션으로 중복 제거와 필터링을 한 번에 수행
- `sorted()`로 정렬, 불필요한 루프 제거
- 25줄을 5줄로 축소, 의도가 즉시 파악됨
- `defaultdict`로 키 존재 여부 체크 코드 제거
- O(n) 리스트 검색 대신 O(1) 집합 연산 사용

#### 예시 2: 제너레이터와 메모리 효율

**Before** (나쁜 예):
```python
def read_large_file(filepath):
    with open(filepath) as f:
        lines = f.readlines()  # 전체 파일을 메모리에 로드

    result = []
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#"):
            result.append(stripped)

    return result


def process_all_records(db_cursor):
    records = db_cursor.fetchall()  # 100만 건을 한 번에 메모리에 로드
    processed = []
    for record in records:
        processed.append(transform(record))
    return processed
```

**문제점**:
- `readlines()`로 전체 파일을 메모리에 한 번에 로드 (GB 단위 파일에서 OOM)
- `fetchall()`로 모든 레코드를 메모리에 로드
- 중간 리스트가 불필요하게 생성됨

**After** (좋은 예):
```python
from collections.abc import Iterator
from typing import Any


def read_large_file(filepath: str) -> Iterator[str]:
    with open(filepath) as f:
        for line in f:  # 파일 객체는 이미 이터레이터
            stripped = line.strip()
            if stripped and not stripped.startswith("#"):
                yield stripped


def process_all_records(db_cursor: Any) -> Iterator[dict]:
    while batch := db_cursor.fetchmany(1000):  # 1000건씩 배치 처리
        for record in batch:
            yield transform(record)


# 사용 예: 메모리 사용량 일정
for line in read_large_file("huge_log.txt"):
    analyze(line)

# 필요한 만큼만 처리
from itertools import islice
first_100 = list(islice(process_all_records(cursor), 100))
```

**개선 효과**:
- 제너레이터로 메모리 사용량을 O(n)에서 O(1)로 절감
- 파일 크기와 무관하게 일정한 메모리 사용
- `fetchmany`로 배치 처리하여 DB 부하 분산
- `islice`로 필요한 만큼만 소비하여 불필요한 처리 방지
- 지연 평가(lazy evaluation)로 응답 시간 개선

#### 예시 3: 컨텍스트 매니저와 리소스 관리

**Before** (나쁜 예):
```python
import sqlite3
import tempfile


def export_data(db_path, output_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    f = open(output_path, "w")

    try:
        cursor.execute("SELECT * FROM users")
        for row in cursor.fetchall():
            f.write(f"{row}\n")
    except Exception:
        print("에러 발생")
    finally:
        f.close()       # 예외 발생 시에도 닫힘을 보장하려 하지만...
        cursor.close()
        conn.close()    # 순서가 잘못되면 리소스 누수


def create_temp_workspace():
    tmpdir = tempfile.mkdtemp()
    # 함수가 예외를 발생시키면 tmpdir이 삭제되지 않음
    do_work(tmpdir)
    shutil.rmtree(tmpdir)  # 여기에 도달하지 못할 수 있음
```

**문제점**:
- 리소스 정리 코드가 `finally` 블록에 분산되어 순서 실수 가능
- 예외 발생 시 리소스가 정리되지 않을 위험
- 임시 디렉토리가 예외 시 삭제되지 않아 디스크 누수

**After** (좋은 예):
```python
import sqlite3
import tempfile
from contextlib import contextmanager
from pathlib import Path


def export_data(db_path: str, output_path: str) -> None:
    with (
        sqlite3.connect(db_path) as conn,
        open(output_path, "w") as f,
    ):
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users")
        for row in cursor.fetchall():
            f.write(f"{row}\n")


def create_temp_workspace() -> None:
    with tempfile.TemporaryDirectory() as tmpdir:
        do_work(tmpdir)
    # TemporaryDirectory가 자동으로 정리


# 커스텀 컨텍스트 매니저
@contextmanager
def managed_connection(host: str, port: int):
    conn = create_connection(host, port)
    try:
        yield conn
    except ConnectionError as e:
        logger.error(f"연결 오류: {e}")
        raise
    finally:
        conn.close()


# 사용
with managed_connection("localhost", 5432) as conn:
    conn.execute("SELECT 1")
```

**개선 효과**:
- `with` 문으로 리소스 생명주기를 자동 관리
- 예외 발생 시에도 리소스가 확실히 정리됨
- 다중 컨텍스트 매니저로 여러 리소스를 동시에 관리
- `@contextmanager`로 커스텀 리소스 관리 패턴 정의

#### 예시 4: 언패킹과 모던 Python 관용구

**Before** (나쁜 예):
```python
def process_coordinates(points):
    for i in range(len(points)):
        x = points[i][0]
        y = points[i][1]
        print(f"Point {i}: ({x}, {y})")


def merge_configs(default_config, user_config):
    result = {}
    for key in default_config:
        result[key] = default_config[key]
    for key in user_config:
        result[key] = user_config[key]
    return result


def find_first_match(items, predicate):
    for item in items:
        if predicate(item):
            return item
    return None
```

**After** (좋은 예):
```python
def process_coordinates(points: list[tuple[float, float]]) -> None:
    for i, (x, y) in enumerate(points):
        print(f"Point {i}: ({x}, {y})")


def merge_configs(
    default_config: dict[str, object],
    user_config: dict[str, object],
) -> dict[str, object]:
    return {**default_config, **user_config}


def find_first_match[T](items: list[T], predicate: callable) -> T | None:
    return next((item for item in items if predicate(item)), None)
```

**개선 효과**:
- `enumerate`로 인덱스와 값을 동시에 언패킹
- 튜플 언패킹 `(x, y)`로 인덱스 접근 제거
- 딕셔너리 언패킹 `{**a, **b}`로 병합을 한 줄로 표현
- `next()` + 제너레이터 표현식으로 첫 번째 매칭 탐색

---

## 3. 에러 처리 (Error Handling)

### 검토 항목

1. `except Exception` 또는 `except:` (bare except)를 사용하고 있는가?
2. 빈 `except` 블록으로 에러를 삼키지 않는가?
3. 예외 체이닝(`raise ... from ...`)을 활용하는가?
4. 커스텀 예외 클래스로 에러 유형을 구분하는가?
5. `try` 블록이 너무 넓지 않은가? (최소 범위 원칙)
6. EAFP 패턴을 적절히 사용하는가?
7. 에러 메시지에 디버깅에 필요한 컨텍스트가 포함되어 있는가?

### 개선 패턴

#### 예시 1: 구체적 예외 처리

**Before** (나쁜 예):
```python
import json


def load_config(filepath):
    try:
        with open(filepath) as f:
            data = json.load(f)
            db_host = data["database"]["host"]
            db_port = data["database"]["port"]
            return {"host": db_host, "port": db_port}
    except Exception:
        # 어떤 에러인지 알 수 없음
        return None


def fetch_user(user_id):
    try:
        response = requests.get(f"/api/users/{user_id}")
        return response.json()
    except:  # bare except - KeyboardInterrupt, SystemExit도 잡힘
        print("에러")
        return {}
```

**문제점**:
- `except Exception`은 모든 예외를 잡아 문제 원인 파악 불가
- `except:` (bare except)는 `KeyboardInterrupt`, `SystemExit`까지 잡아 프로그램 종료 방해
- `return None`으로 에러를 삼켜 호출자가 실패 원인을 알 수 없음
- `try` 블록이 너무 넓어 어떤 줄에서 예외가 발생하는지 불명확

**After** (좋은 예):
```python
import json
from pathlib import Path


class ConfigError(Exception):
    """설정 파일 관련 에러"""


class ConfigFileNotFoundError(ConfigError):
    def __init__(self, filepath: str) -> None:
        super().__init__(f"설정 파일을 찾을 수 없습니다: {filepath}")
        self.filepath = filepath


class ConfigParseError(ConfigError):
    def __init__(self, filepath: str, cause: Exception) -> None:
        super().__init__(f"설정 파일 파싱 실패: {filepath}")
        self.filepath = filepath
        self.cause = cause


def load_config(filepath: str) -> dict[str, str | int]:
    path = Path(filepath)

    if not path.exists():
        raise ConfigFileNotFoundError(filepath)

    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError as e:
        raise ConfigParseError(filepath, e) from e

    try:
        return {
            "host": data["database"]["host"],
            "port": data["database"]["port"],
        }
    except KeyError as e:
        raise ConfigParseError(
            filepath,
            KeyError(f"필수 설정 키 누락: {e}"),
        ) from e


def fetch_user(user_id: int) -> dict:
    try:
        response = requests.get(f"/api/users/{user_id}")
        response.raise_for_status()
    except requests.ConnectionError as e:
        raise ConnectionError(f"API 서버 연결 실패: {e}") from e
    except requests.HTTPError as e:
        raise ValueError(
            f"사용자 조회 실패 (ID: {user_id}): {response.status_code}"
        ) from e

    return response.json()
```

**개선 효과**:
- 구체적인 예외 유형별 처리로 적절한 대응 가능
- `raise ... from e`로 원인 예외를 체이닝하여 전체 스택 추적 보존
- 커스텀 예외에 컨텍스트 정보(파일 경로, 사용자 ID) 포함
- `try` 블록을 최소 범위로 제한하여 예외 발생 지점 명확화

#### 예시 2: EAFP vs LBYL

**Before** (나쁜 예):
```python
import os


def read_setting(config, section, key, default=None):
    # LBYL (Look Before You Leap) - 과도한 사전 체크
    if config is not None:
        if isinstance(config, dict):
            if section in config:
                if isinstance(config[section], dict):
                    if key in config[section]:
                        value = config[section][key]
                        if value is not None:
                            return value
    return default


def safe_divide(a, b):
    if b is not None:
        if isinstance(b, (int, float)):
            if b != 0:
                return a / b
    return 0
```

**문제점**:
- 중첩된 조건문이 5단계 이상으로 가독성 매우 저하
- 각 조건문이 이미 Python이 기본으로 처리하는 검사를 중복
- LBYL 패턴은 TOCTOU(Time of Check to Time of Use) 경쟁 조건에 취약

**After** (좋은 예):
```python
def read_setting(
    config: dict | None,
    section: str,
    key: str,
    default: object = None,
) -> object:
    # EAFP (Easier to Ask Forgiveness than Permission)
    try:
        return config[section][key]  # type: ignore[index]
    except (KeyError, TypeError):
        return default


def safe_divide(a: float, b: float) -> float:
    try:
        return a / b
    except ZeroDivisionError:
        return 0.0
```

**개선 효과**:
- EAFP 패턴으로 중첩 조건문을 제거하여 가독성 향상
- Python의 예외 처리 메커니즘을 활용한 관용적 코드
- TOCTOU 경쟁 조건 해소 (체크와 사용이 원자적)
- 코드량 70% 감소

#### 예시 3: 커스텀 예외 계층 구조

**Before** (나쁜 예):
```python
def create_order(user_id, product_id, quantity):
    user = find_user(user_id)
    if not user:
        raise ValueError("사용자를 찾을 수 없습니다")

    product = find_product(product_id)
    if not product:
        raise ValueError("상품을 찾을 수 없습니다")

    if product.stock < quantity:
        raise RuntimeError("재고 부족")

    if user.balance < product.price * quantity:
        raise RuntimeError("잔액 부족")

    return process_order(user, product, quantity)


# 호출자: 에러 메시지 문자열로 분기
try:
    create_order(1, 2, 3)
except ValueError as e:
    if "사용자" in str(e):
        show_not_found_page()
    elif "상품" in str(e):
        show_product_page()
except RuntimeError as e:
    if "재고" in str(e):
        show_stock_alert()
```

**문제점**:
- `ValueError`, `RuntimeError` 같은 내장 예외로 비즈니스 에러를 표현
- 에러 메시지 문자열로 분기하여 오타에 취약
- 에러 메시지 변경 시 모든 분기 코드 수정 필요
- 에러에 구조화된 데이터를 담을 수 없음

**After** (좋은 예):
```python
from dataclasses import dataclass


# 에러 계층 구조
class AppError(Exception):
    """애플리케이션 기본 예외"""

    def __init__(self, message: str, code: str) -> None:
        super().__init__(message)
        self.code = code


class NotFoundError(AppError):
    def __init__(self, resource: str, resource_id: int | str) -> None:
        super().__init__(
            f"{resource}을(를) 찾을 수 없습니다 (ID: {resource_id})",
            code="NOT_FOUND",
        )
        self.resource = resource
        self.resource_id = resource_id


@dataclass
class InsufficientStockError(AppError):
    product_id: int
    requested: int
    available: int

    def __init__(self, product_id: int, requested: int, available: int) -> None:
        super().__init__(
            f"재고 부족: 요청 {requested}개, 남은 수량 {available}개",
            code="INSUFFICIENT_STOCK",
        )
        self.product_id = product_id
        self.requested = requested
        self.available = available


class InsufficientBalanceError(AppError):
    def __init__(self, required: float, available: float) -> None:
        super().__init__(
            f"잔액 부족: 필요 {required:,.0f}원, 현재 {available:,.0f}원",
            code="INSUFFICIENT_BALANCE",
        )
        self.required = required
        self.available = available


def create_order(user_id: int, product_id: int, quantity: int) -> Order:
    user = find_user(user_id)
    if not user:
        raise NotFoundError("사용자", user_id)

    product = find_product(product_id)
    if not product:
        raise NotFoundError("상품", product_id)

    if product.stock < quantity:
        raise InsufficientStockError(product_id, quantity, product.stock)

    total = product.price * quantity
    if user.balance < total:
        raise InsufficientBalanceError(total, user.balance)

    return process_order(user, product, quantity)


# 호출자: isinstance로 안전하게 분기
try:
    create_order(1, 2, 3)
except NotFoundError as e:
    handle_not_found(e.resource, e.resource_id)
except InsufficientStockError as e:
    show_stock_alert(e.product_id, e.available)
except InsufficientBalanceError as e:
    show_payment_page(e.required, e.available)
except AppError as e:
    show_error(e.code, str(e))
```

**개선 효과**:
- `isinstance` 기반 분기로 에러 메시지 변경에도 안전
- 각 예외에 구조화된 컨텍스트 데이터 포함
- 예외 계층 구조로 공통 처리(`AppError`)와 세부 처리 분리
- 에러 코드(`code`)로 API 응답 매핑 용이

---

## 4. 비동기 처리 (Async Patterns)

### 검토 항목

1. I/O 바운드 작업에 `asyncio`를 적절히 사용하는가?
2. CPU 바운드 작업에 `asyncio` 대신 `multiprocessing`이나 `concurrent.futures`를 사용하는가?
3. 병렬 가능한 비동기 작업에 `asyncio.gather`를 사용하는가?
4. 동기 코드와 비동기 코드가 혼재되어 있지 않은가?
5. 비동기 컨텍스트 매니저(`async with`)를 사용하는가?
6. `asyncio.run`이 올바르게 사용되는가? (중첩 호출 방지)
7. 비동기 이터레이터/제너레이터를 적절히 활용하는가?

### 개선 패턴

#### 예시 1: 순차 실행에서 병렬 실행으로

**Before** (나쁜 예):
```python
import asyncio
import aiohttp


async def load_dashboard(user_id: int) -> dict:
    # 독립적인 API 호출을 순차 실행
    user = await fetch_user(user_id)
    notifications = await fetch_notifications(user_id)
    analytics = await fetch_analytics(user_id)
    recent_orders = await fetch_recent_orders(user_id)

    return {
        "user": user,
        "notifications": notifications,
        "analytics": analytics,
        "recent_orders": recent_orders,
    }
```

**문제점**:
- 4개의 독립적인 API 호출을 순차 실행
- 각 호출이 300ms라면 총 1200ms 소요
- 비동기의 이점을 전혀 활용하지 못함

**After** (좋은 예):
```python
import asyncio


async def load_dashboard(user_id: int) -> dict:
    # 독립적인 작업은 병렬 실행
    user, notifications, analytics, recent_orders = await asyncio.gather(
        fetch_user(user_id),
        fetch_notifications(user_id),
        fetch_analytics(user_id),
        fetch_recent_orders(user_id),
    )

    return {
        "user": user,
        "notifications": notifications,
        "analytics": analytics,
        "recent_orders": recent_orders,
    }
```

**개선 효과**:
- `asyncio.gather`로 4개 API를 병렬 실행 (총 300ms, 75% 개선)
- 구조분해로 결과를 명확하게 매핑
- 하나라도 실패하면 전체 실패 (엄격한 일관성)

#### 예시 2: 부분 실패 허용과 타임아웃

**Before** (나쁜 예):
```python
async def send_bulk_notifications(user_ids: list[int]) -> dict:
    try:
        # 한 명이라도 실패하면 전체 실패
        results = await asyncio.gather(
            *[send_notification(uid) for uid in user_ids]
        )
        return {"success": True, "count": len(results)}
    except Exception as e:
        # 어떤 사용자가 실패했는지 알 수 없음
        return {"success": False, "error": str(e)}
```

**After** (좋은 예):
```python
async def send_bulk_notifications(
    user_ids: list[int],
    timeout: float = 10.0,
) -> dict:
    tasks = [
        asyncio.wait_for(send_notification(uid), timeout=timeout)
        for uid in user_ids
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    succeeded = []
    failed = []
    for uid, result in zip(user_ids, results):
        if isinstance(result, Exception):
            failed.append({"user_id": uid, "error": str(result)})
        else:
            succeeded.append(uid)

    return {
        "total": len(user_ids),
        "succeeded": len(succeeded),
        "failed": len(failed),
        "errors": failed,
    }
```

**개선 효과**:
- `return_exceptions=True`로 부분 실패 시에도 전체 결과 수집
- `asyncio.wait_for`로 개별 작업에 타임아웃 적용
- 실패한 항목을 정확히 식별하여 재시도 가능
- 사용자에게 상세한 결과 리포트 제공

#### 예시 3: 동기/비동기 분리

**Before** (나쁜 예):
```python
import asyncio
import time


async def process_data(items: list[dict]) -> list[dict]:
    results = []
    for item in items:
        # CPU 바운드 작업을 async 함수에서 직접 실행
        # 이벤트 루프를 블로킹하여 다른 코루틴 실행 불가
        processed = heavy_computation(item)  # 동기 함수
        time.sleep(1)  # 비동기 컨텍스트에서 동기 sleep 사용
        results.append(processed)
    return results
```

**문제점**:
- CPU 바운드 작업이 이벤트 루프를 블로킹
- `time.sleep`이 비동기 컨텍스트에서 전체 이벤트 루프를 정지시킴
- 다른 코루틴이 실행 기회를 얻지 못함

**After** (좋은 예):
```python
import asyncio
from concurrent.futures import ProcessPoolExecutor
from functools import partial


async def process_data(items: list[dict]) -> list[dict]:
    loop = asyncio.get_running_loop()

    # CPU 바운드 작업은 프로세스 풀에서 실행
    with ProcessPoolExecutor() as pool:
        tasks = [
            loop.run_in_executor(pool, partial(heavy_computation, item))
            for item in items
        ]
        results = await asyncio.gather(*tasks)

    return list(results)


# I/O 대기에는 asyncio.sleep 사용
async def poll_status(task_id: str) -> dict:
    while True:
        status = await fetch_status(task_id)
        if status["completed"]:
            return status
        await asyncio.sleep(1)  # 비동기 sleep - 이벤트 루프 블로킹 없음
```

**개선 효과**:
- CPU 바운드 작업을 `ProcessPoolExecutor`에서 별도 프로세스로 실행
- 이벤트 루프 블로킹 없이 비동기 작업 계속 진행
- `asyncio.sleep`으로 다른 코루틴에 실행 기회 양보
- I/O 바운드와 CPU 바운드 작업의 명확한 분리

---

## 5. 모듈 구성 (Module Organization)

### 검토 항목

1. 패키지 구조가 도메인 기반으로 구성되어 있는가?
2. 순환 임포트(circular import)가 발생하지 않는가?
3. `__all__`로 공개 API를 명시적으로 정의하는가?
4. 와일드카드 임포트(`from module import *`)를 사용하지 않는가?
5. 상대 임포트와 절대 임포트를 일관되게 사용하는가?
6. `__init__.py`가 과도한 로직을 포함하지 않는가?
7. 모듈 수준의 부수효과(side effect)가 없는가?

### 개선 패턴

#### 예시 1: 패키지 구조 설계

**Before** (나쁜 예):
```
project/
├── utils.py           # 200+ 함수가 하나의 파일에
├── models.py          # 모든 모델이 하나의 파일에
├── services.py        # 모든 서비스가 하나의 파일에
├── helpers.py         # utils.py와 구분 불명확
└── constants.py       # 모든 상수가 하나의 파일에
```

```python
# utils.py - 600줄, 관련 없는 함수들이 뒤섞임
def format_date(dt): ...
def validate_email(email): ...
def calculate_shipping(weight): ...
def parse_csv(filepath): ...
def send_email(to, subject, body): ...
def resize_image(path, width, height): ...
```

**문제점**:
- "God Module" 안티패턴: 모든 유틸리티가 하나의 파일에 집중
- 관련 없는 기능이 섞여 응집도가 매우 낮음
- 파일이 비대해져 탐색과 유지보수 어려움
- `utils`와 `helpers`의 구분이 모호

**After** (좋은 예):
```
project/
├── users/
│   ├── __init__.py      # 공개 API만 노출
│   ├── models.py        # User, UserProfile
│   ├── services.py      # UserService
│   ├── validators.py    # validate_email, validate_age
│   └── exceptions.py    # UserNotFoundError
├── orders/
│   ├── __init__.py
│   ├── models.py        # Order, OrderItem
│   ├── services.py      # OrderService
│   ├── calculator.py    # calculate_shipping, calculate_tax
│   └── exceptions.py    # InsufficientStockError
├── shared/
│   ├── __init__.py
│   ├── formatting.py    # format_date, format_currency
│   ├── email.py         # send_email, EmailTemplate
│   └── imaging.py       # resize_image, compress_image
└── core/
    ├── __init__.py
    ├── config.py        # 설정 관리
    └── database.py      # DB 연결 관리
```

```python
# users/__init__.py - 공개 API만 노출
from users.models import User, UserProfile
from users.services import UserService
from users.exceptions import UserNotFoundError

__all__ = ["User", "UserProfile", "UserService", "UserNotFoundError"]
```

**개선 효과**:
- 도메인별로 관련 코드를 그룹화하여 높은 응집도 달성
- 각 모듈의 책임이 명확하여 탐색 용이
- `__all__`로 공개 API를 명시하여 내부 구현 은닉
- 독립적인 테스트와 재사용이 가능한 구조

#### 예시 2: 순환 임포트 해결

**Before** (나쁜 예):
```python
# user.py
from order import Order  # order.py가 user.py를 임포트하면 순환

class User:
    def __init__(self, name: str) -> None:
        self.name = name
        self.orders: list[Order] = []


# order.py
from user import User  # 순환 임포트!

class Order:
    def __init__(self, buyer: User, amount: float) -> None:
        self.buyer = buyer
        self.amount = amount
```

**문제점**:
- `user.py` ↔ `order.py` 순환 참조
- `ImportError` 또는 `AttributeError` 발생 가능
- 모듈 초기화 순서에 따라 결과가 달라짐

**After** (좋은 예):
```python
# 방법 1: TYPE_CHECKING으로 타입 힌트만 분리
# user.py
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from order import Order  # 런타임에는 임포트되지 않음


class User:
    def __init__(self, name: str) -> None:
        self.name = name
        self.orders: list[Order] = []


# order.py
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from user import User


class Order:
    def __init__(self, buyer: User, amount: float) -> None:
        self.buyer = buyer
        self.amount = amount


# 방법 2: 공유 타입을 별도 모듈로 추출
# types.py
from dataclasses import dataclass, field


@dataclass
class User:
    name: str
    orders: list[Order] = field(default_factory=list)


@dataclass
class Order:
    buyer: User
    amount: float


# user_service.py
from types import User

def get_user_display_name(user: User) -> str:
    return f"{user.name} ({len(user.orders)} orders)"


# order_service.py
from types import Order

def get_order_summary(order: Order) -> str:
    return f"Order by {order.buyer.name}: {order.amount}"
```

**개선 효과**:
- `TYPE_CHECKING`으로 런타임 임포트 제거, 타입 힌트만 유지
- `from __future__ import annotations`로 문자열 어노테이션 활성화
- 공유 타입을 별도 모듈로 추출하여 의존 방향 단순화
- 순환 의존성 제거로 모듈 초기화 문제 해결

#### 예시 3: 와일드카드 임포트 제거

**Before** (나쁜 예):
```python
# 와일드카드 임포트: 네임스페이스 오염
from utils import *
from models import *
from constants import *

# 어떤 모듈에서 온 건지 알 수 없음
result = format_date(today)  # utils? helpers?
user = User(name="Alice")    # models? schemas?
MAX_RETRIES = 3              # constants? config?
```

**문제점**:
- 이름 충돌 위험 (같은 이름이 여러 모듈에 존재하면 마지막 것으로 덮어씀)
- 코드를 읽을 때 함수/클래스의 출처를 파악할 수 없음
- IDE의 자동 완성/리팩토링 기능 약화
- `mypy`/`pylint` 등 정적 분석 도구의 정확도 저하

**After** (좋은 예):
```python
# 명시적 임포트
from utils import format_date, format_currency
from models import User, Order
from constants import MAX_RETRIES, DEFAULT_TIMEOUT

# 모듈 별칭으로 네임스페이스 활용
import numpy as np
import pandas as pd
from pathlib import Path

result = format_date(today)       # utils에서 온 것이 명확
user = User(name="Alice")        # models에서 온 것이 명확
array = np.array([1, 2, 3])      # numpy임이 즉시 파악
```

**개선 효과**:
- 모든 이름의 출처가 명확하여 코드 이해도 향상
- 이름 충돌 가능성 제거
- IDE 자동 완성과 정적 분석 도구의 정확도 향상
- 사용하지 않는 임포트를 쉽게 식별하여 제거 가능

---

## 6. 데이터 클래스와 불변성 (Data Classes & Immutability)

### 검토 항목

1. 데이터 컨테이너에 일반 클래스 대신 `dataclass`를 사용하는가?
2. 변경되면 안 되는 데이터에 `frozen=True`를 사용하는가?
3. `NamedTuple`로 대체 가능한 간단한 데이터가 있는가?
4. 가변 기본값(`list`, `dict`)을 `field(default_factory=...)`로 처리하는가?
5. 외부 입력 검증에 Pydantic `BaseModel`을 활용하는가?
6. `__post_init__`에서 유효성 검사를 수행하는가?
7. `slots=True`로 메모리 최적화를 고려했는가? (Python 3.10+)

### 개선 패턴

#### 예시 1: 일반 클래스에서 dataclass로

**Before** (나쁜 예):
```python
class User:
    def __init__(self, name, email, age, is_active=True):
        self.name = name
        self.email = email
        self.age = age
        self.is_active = is_active

    def __repr__(self):
        return f"User(name={self.name!r}, email={self.email!r}, age={self.age}, is_active={self.is_active})"

    def __eq__(self, other):
        if not isinstance(other, User):
            return NotImplemented
        return (
            self.name == other.name
            and self.email == other.email
            and self.age == other.age
            and self.is_active == other.is_active
        )

    def __hash__(self):
        return hash((self.name, self.email, self.age, self.is_active))
```

**문제점**:
- `__init__`, `__repr__`, `__eq__`, `__hash__`를 수동으로 구현 (보일러플레이트)
- 필드 추가 시 4개 메서드를 모두 수정해야 함
- 타입 힌트가 없어 데이터 구조 파악 어려움
- 실수로 메서드 동기화를 빠뜨릴 위험

**After** (좋은 예):
```python
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class User:
    name: str
    email: str
    age: int
    is_active: bool = True
```

**개선 효과**:
- `__init__`, `__repr__`, `__eq__`, `__hash__`가 자동 생성
- 25줄이 7줄로 축소
- `frozen=True`로 불변 객체 보장 (해시 가능, 딕셔너리 키로 사용 가능)
- `slots=True`로 메모리 사용량 감소, 속성 접근 속도 향상
- 타입 힌트가 기본 내장되어 정적 분석 즉시 가능

#### 예시 2: 가변 기본값 함정

**Before** (나쁜 예):
```python
class Team:
    def __init__(self, name, members=[]):  # 가변 기본값!
        self.name = name
        self.members = members

    def add_member(self, member):
        self.members.append(member)


# 모든 인스턴스가 같은 리스트 객체를 공유
team_a = Team("A팀")
team_a.add_member("Alice")

team_b = Team("B팀")
print(team_b.members)  # ['Alice'] - B팀에 Alice가?!
```

**문제점**:
- 함수의 기본 인자는 함수 정의 시 한 번만 평가됨
- 모든 인스턴스가 동일한 리스트 객체를 공유하여 의도치 않은 데이터 공유
- Python에서 가장 흔한 실수 중 하나

**After** (좋은 예):
```python
from dataclasses import dataclass, field


@dataclass
class Team:
    name: str
    members: list[str] = field(default_factory=list)

    def add_member(self, member: str) -> None:
        self.members.append(member)


# 각 인스턴스가 독립적인 리스트를 가짐
team_a = Team("A팀")
team_a.add_member("Alice")

team_b = Team("B팀")
print(team_b.members)  # [] - 독립적
```

**개선 효과**:
- `field(default_factory=list)`로 인스턴스마다 새로운 리스트 생성
- `dataclass`가 가변 기본값을 자동으로 감지하여 `TypeError` 발생 (안전장치)
- 인스턴스 간 데이터 격리 보장
- Python의 가장 흔한 버그를 구조적으로 방지

#### 예시 3: Pydantic을 활용한 외부 입력 검증

**Before** (나쁜 예):
```python
def create_user(data: dict) -> dict:
    # 수동 유효성 검사: 누락 가능성 높음
    if "name" not in data:
        raise ValueError("name 필드 필요")
    if not isinstance(data["name"], str):
        raise ValueError("name은 문자열이어야 함")
    if len(data["name"]) < 1:
        raise ValueError("name은 비어있을 수 없음")

    if "email" not in data:
        raise ValueError("email 필드 필요")
    if "@" not in data["email"]:
        raise ValueError("유효하지 않은 이메일")

    if "age" in data:
        if not isinstance(data["age"], int):
            raise ValueError("age는 정수여야 함")
        if data["age"] < 0 or data["age"] > 150:
            raise ValueError("유효하지 않은 나이")

    return {
        "name": data["name"].strip(),
        "email": data["email"].lower(),
        "age": data.get("age"),
    }
```

**문제점**:
- 유효성 검사 코드가 비즈니스 로직보다 길어짐
- 검증 규칙이 누락되기 쉬움
- 에러 메시지가 일관되지 않음
- 타입 변환이 명시적이지 않음

**After** (좋은 예):
```python
from pydantic import BaseModel, EmailStr, Field


class CreateUserRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    age: int | None = Field(default=None, ge=0, le=150)

    model_config = {"str_strip_whitespace": True}


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    age: int | None


def create_user(data: dict) -> UserResponse:
    # Pydantic이 자동으로 검증 + 변환
    request = CreateUserRequest.model_validate(data)
    user = save_to_db(request)
    return UserResponse.model_validate(user)
```

**개선 효과**:
- 선언적으로 유효성 규칙을 정의하여 누락 방지
- 자동 타입 변환 (`"25"` → `25`)
- 일관된 에러 메시지 (ValidationError)
- JSON 직렬화/역직렬화 자동 지원
- OpenAPI 스키마 자동 생성 (FastAPI 연동)

---

## 7. 함수 설계 (Function Design)

### 검토 항목

1. 함수의 인자가 5개 이상인가? (데이터 클래스로 그룹화 가능한가?)
2. `*args`와 `**kwargs`가 타입 정보 없이 남용되는가?
3. 데코레이터가 함수 시그니처를 보존하는가? (`@functools.wraps`)
4. 부수효과(side effect)가 있는 함수가 명확히 구분되는가?
5. 함수가 `None`을 암묵적으로 반환하지 않는가?
6. 클로저가 변경 가능한(mutable) 외부 변수를 캡처하지 않는가?
7. `property`가 비용이 큰 연산에 사용되지 않는가?

### 개선 패턴

#### 예시 1: 매개변수 그룹화

**Before** (나쁜 예):
```python
def send_email(
    to_address,
    from_address,
    subject,
    body,
    cc=None,
    bcc=None,
    reply_to=None,
    priority="normal",
    html=False,
    attachments=None,
    charset="utf-8",
    timeout=30,
):
    # 12개의 매개변수 - 호출 시 혼동 가능
    ...


# 호출 시 위치 인자로 전달하면 순서 실수 가능
send_email(
    "to@example.com",
    "from@example.com",
    "Hello",
    "Body",
    None,
    None,
    None,
    "high",
    True,
)
```

**문제점**:
- 12개 매개변수로 함수 시그니처가 과도하게 복잡
- 위치 인자로 호출 시 순서 실수 가능
- 관련 있는 매개변수가 그룹화되지 않음
- 기본값이 있는 중간 인자를 건너뛰려면 `None`을 명시적으로 전달

**After** (좋은 예):
```python
from dataclasses import dataclass, field


@dataclass(frozen=True)
class EmailMessage:
    to_address: str
    from_address: str
    subject: str
    body: str
    cc: list[str] = field(default_factory=list)
    bcc: list[str] = field(default_factory=list)
    reply_to: str | None = None
    is_html: bool = False
    attachments: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class EmailConfig:
    charset: str = "utf-8"
    timeout: int = 30
    priority: str = "normal"


def send_email(
    message: EmailMessage,
    config: EmailConfig = EmailConfig(),
) -> bool:
    ...


# 호출 시 명확한 구조
send_email(
    message=EmailMessage(
        to_address="to@example.com",
        from_address="from@example.com",
        subject="Hello",
        body="<h1>Hi</h1>",
        is_html=True,
    ),
    config=EmailConfig(priority="high"),
)
```

**개선 효과**:
- 관련 매개변수를 데이터 클래스로 그룹화하여 의미 명확화
- 키워드 인자로만 사용하여 순서 실수 방지
- `EmailConfig`에 합리적인 기본값을 설정하여 호출 단순화
- 메시지와 설정의 관심사 분리

#### 예시 2: 데코레이터 작성 패턴

**Before** (나쁜 예):
```python
import time


def timer(func):
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        elapsed = time.time() - start
        print(f"{func.__name__} took {elapsed:.2f}s")
        return result
    return wrapper


@timer
def process_data(data: list[dict]) -> dict:
    """데이터를 처리하여 요약을 반환합니다."""
    ...


# 함수 메타데이터가 손실됨
print(process_data.__name__)  # 'wrapper' (process_data가 아님!)
print(process_data.__doc__)   # None (docstring 손실!)
help(process_data)            # wrapper에 대한 도움말 표시
```

**문제점**:
- `@functools.wraps` 없이 원본 함수의 메타데이터(`__name__`, `__doc__`) 손실
- `help()`와 디버깅 도구에서 원본 함수 정보를 볼 수 없음
- 타입 힌트가 보존되지 않아 IDE 지원 약화

**After** (좋은 예):
```python
import functools
import time
from collections.abc import Callable
from typing import ParamSpec, TypeVar

P = ParamSpec("P")
R = TypeVar("R")


def timer(func: Callable[P, R]) -> Callable[P, R]:
    @functools.wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        print(f"{func.__name__} took {elapsed:.4f}s")
        return result
    return wrapper


@timer
def process_data(data: list[dict]) -> dict:
    """데이터를 처리하여 요약을 반환합니다."""
    ...


# 메타데이터 보존
print(process_data.__name__)  # 'process_data'
print(process_data.__doc__)   # '데이터를 처리하여 요약을 반환합니다.'
```

**개선 효과**:
- `@functools.wraps`로 원본 함수의 메타데이터 완전 보존
- `ParamSpec`/`TypeVar`로 데코레이터의 타입 안전성 확보
- `time.perf_counter()`로 더 정밀한 시간 측정
- IDE에서 원본 함수의 타입 힌트와 docstring 표시

#### 예시 3: 암묵적 None 반환 방지

**Before** (나쁜 예):
```python
def find_user(user_id: int):
    user = db.query(User).filter_by(id=user_id).first()
    if user:
        return user
    # else 없음 - 암묵적으로 None 반환


def calculate_discount(price: float, membership: str):
    if membership == "gold":
        return price * 0.2
    elif membership == "silver":
        return price * 0.1
    # "bronze"나 다른 값이면 None 반환 - 버그


# 호출자: None 체크를 잊기 쉬움
discount = calculate_discount(10000, "bronze")
final_price = 10000 - discount  # TypeError: unsupported operand type
```

**문제점**:
- 함수가 모든 경로에서 값을 반환하지 않아 암묵적 `None` 반환
- 반환 타입에 `None` 가능성이 명시되지 않아 호출자가 인지 못함
- `mypy`의 `--strict` 모드에서도 놓칠 수 있음

**After** (좋은 예):
```python
def find_user(user_id: int) -> User | None:
    """사용자를 ID로 조회합니다. 없으면 None을 반환합니다."""
    return db.query(User).filter_by(id=user_id).first()


def calculate_discount(price: float, membership: str) -> float:
    discounts = {
        "gold": 0.2,
        "silver": 0.1,
        "bronze": 0.05,
    }
    rate = discounts.get(membership, 0.0)
    return price * rate


# 또는 Union 타입으로 실패를 명시
def find_user_strict(user_id: int) -> User:
    """사용자를 ID로 조회합니다. 없으면 예외를 발생시킵니다."""
    user = db.query(User).filter_by(id=user_id).first()
    if user is None:
        raise NotFoundError("User", user_id)
    return user
```

**개선 효과**:
- 반환 타입이 `User | None`으로 명시되어 호출자가 `None` 처리를 인지
- 딕셔너리 매핑으로 모든 분기를 처리하여 암묵적 `None` 제거
- `mypy`가 `None` 체크 누락을 컴파일 시점에 감지
- `find_user_strict`처럼 `None` 대신 예외를 사용하는 선택지 제공

---

## 8. 통합 체크리스트

코드 리뷰 시 다음 표를 기준으로 우선순위에 따라 검토합니다:

| 카테고리 | 검토 항목 | 우선순위 |
|----------|-----------|----------|
| **에러 처리** | `except:` (bare except) 또는 `except Exception` 남용 | **High** |
| **에러 처리** | 빈 `except` 블록으로 에러를 삼킴 | **High** |
| **에러 처리** | `raise ... from ...` 없이 예외 재발생 (원인 체인 손실) | **High** |
| **타입 힌트** | 공개 API에 타입 힌트 누락 | **High** |
| **타입 힌트** | `Any` 타입 남용 | **High** |
| **모듈 구성** | 순환 임포트 존재 | **High** |
| **모듈 구성** | 와일드카드 임포트 (`from x import *`) | **High** |
| **데이터 클래스** | 가변 기본값 (`def f(items=[])`) 사용 | **High** |
| **Pythonic 패턴** | `range(len(...))`으로 인덱스 루프 | **Medium** |
| **Pythonic 패턴** | 리소스 관리에 `with` 문 미사용 | **Medium** |
| **Pythonic 패턴** | 대용량 데이터에 리스트 대신 제너레이터 미사용 | **Medium** |
| **비동기 처리** | 병렬 가능한 비동기 작업의 순차 실행 | **Medium** |
| **비동기 처리** | `time.sleep`을 비동기 컨텍스트에서 사용 | **Medium** |
| **함수 설계** | 매개변수 5개 이상인 함수 | **Medium** |
| **함수 설계** | 암묵적 `None` 반환 | **Medium** |
| **에러 처리** | 커스텀 예외 없이 내장 예외로 비즈니스 에러 표현 | **Medium** |
| **타입 힌트** | `Union` 타입의 안전하지 않은 분기 처리 | **Medium** |
| **모듈 구성** | `__all__` 미정의 (공개 API 불명확) | **Medium** |
| **데이터 클래스** | 보일러플레이트 클래스 (`dataclass` 미사용) | **Medium** |
| **Pythonic 패턴** | 컴프리헨션으로 대체 가능한 명령형 루프 | **Low** |
| **Pythonic 패턴** | `enumerate`, `zip` 미사용 | **Low** |
| **타입 힌트** | `Protocol` 대신 ABC로 과도한 상속 강제 | **Low** |
| **함수 설계** | `@functools.wraps` 없는 데코레이터 | **Low** |
| **데이터 클래스** | `frozen=True` 미사용 (불변성 미적용) | **Low** |
| **데이터 클래스** | `slots=True` 미사용 (메모리 최적화 미적용) | **Low** |
| **비동기 처리** | CPU 바운드 작업에 `asyncio` 사용 | **Low** |
| **모듈 구성** | 상대/절대 임포트 혼용 | **Low** |

### 우선순위 판단 기준

| 우선순위 | 기준 | 조치 |
|----------|------|------|
| **High** | 버그 유발 가능, 런타임 에러 위험, 보안 취약점, 데이터 손상 | 즉시 수정 요청 |
| **Medium** | 유지보수성 저하, 잠재적 버그 가능성, 성능 이슈, 가독성 감소 | 이번 PR에서 수정 권장 |
| **Low** | 코드 스타일, 추가 최적화, 관례적 개선, 메모리 최적화 | 다음 리팩토링에서 개선 |

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
2. **개선 효과를 정량적으로 설명하라** - "좋아짐" 대신 "메모리 사용량 O(n)에서 O(1)로 감소"
3. **우선순위를 명시하라** - 모든 항목이 같은 중요도가 아님
4. **Tidy First 관점을 유지하라** - 기능 변경 전에 코드를 먼저 정리
5. **Pythonic을 강요하지 마라** - 가독성이 더 중요한 경우 관용구를 고집하지 않음

---

**이 가이드를 활용하여 Python 코드의 품질을 체계적으로 개선하세요!**
