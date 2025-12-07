# Form-ation

웹 폼 입력값을 저장하고 재방문 시 자동 완성해주는 Chrome 확장 프로그램입니다.

## 주요 기능

### 셀렉터 모드

- 저장할 입력 필드를 직접 클릭하여 선택
- 선택한 필드의 값을 별칭과 함께 저장
- CSR(Client-Side Rendering) 앱에서도 정상 동작

### 자동 입력

- 같은 URL 재방문 시 저장된 데이터 목록 표시
- 원하는 데이터 세트를 선택하여 자동 입력
- 정확한 매칭으로 안전한 자동 입력

### 데이터 관리

- URL별 여러 데이터 세트 저장 가능 (SET 1, SET 2, ...)
- Options 페이지에서 저장된 데이터 조회/수정/삭제
- 모든 데이터는 로컬에만 저장 (서버 전송 없음)

## 기술 스택

- **Frontend**: React 19 + TypeScript
- **Build**: Vite + @crxjs/vite-plugin
- **Extension**: Chrome Manifest V3
- **Storage**: chrome.storage.local

## 설치

### 개발자 모드 설치

```bash
# 1. 저장소 클론
git clone <repository>
cd Form-ation

# 2. 의존성 설치
pnpm install

# 3. 빌드
pnpm build

# 4. Chrome에 로드
# chrome://extensions → 개발자 모드 ON → 압축해제된 확장 프로그램 로드 → dist 폴더 선택
```

### 개발 모드

```bash
pnpm dev
```

## 사용법

### 폼 데이터 저장

1. 저장하고 싶은 폼이 있는 페이지에서 Form-ation 아이콘 클릭
2. **새로 저장** 버튼 클릭하여 셀렉터 모드 활성화
3. 저장할 입력 필드들을 클릭하여 선택 (선택된 필드는 초록색 테두리)
4. **저장** 버튼 클릭 후 별칭 입력

### 자동 입력

1. 저장된 데이터가 있는 페이지 재방문
2. Form-ation 아이콘 클릭
3. 원하는 데이터 세트의 **입력** 버튼 클릭

### 데이터 관리

1. Form-ation 아이콘 우클릭 → 옵션
2. 저장된 모든 데이터 조회
3. 별칭 수정 또는 삭제

## 프로젝트 구조

```
src/
├── types/index.ts              # 도메인 모델 정의
├── storage/
│   └── FieldMemoryRepository.ts # 데이터 CRUD
├── core/
│   ├── FieldExtractor.ts       # 필드 정보 추출
│   ├── FieldMatcher.ts         # 필드 매칭
│   ├── AutoFiller.ts           # 자동 입력 실행
│   └── index.ts
├── ui/
│   ├── Toast.ts                # 토스트 알림
│   ├── Overlay.ts              # 오버레이
│   ├── AliasModal.ts           # 별칭 입력 모달
│   └── index.ts
├── content/
│   ├── index.ts                # Content Script 진입점
│   ├── SelectorMode.ts         # 필드 선택 UI
│   └── FieldObserver.ts        # 동적 DOM 감지
├── background/index.ts         # Service Worker
├── popup/                      # 팝업 UI (React)
├── options/                    # 옵션 페이지 (React)
└── manifest.ts                 # 확장 프로그램 설정
```

## 아키텍처

### 메시지 흐름

```
Popup ←→ Background (Service Worker) ←→ Content Script
              ↓
        Chrome Storage
```

### 핵심 설계

| 원칙        | 적용                                     |
| ----------- | ---------------------------------------- |
| 단일 책임   | 각 모듈이 하나의 역할만 담당             |
| 정확 매칭   | 셀렉터 + 타입 완전 일치 시에만 자동 입력 |
| URL 정규화  | pathname만 비교 (쿼리/해시 무시)         |
| 안정성 표시 | 불안정한 셀렉터 선택 시 경고             |

### 셀렉터 우선순위

1. `name` 속성 (가장 안정적)
2. `data-testid`, `data-test-id`, `data-cy`
3. `id` 속성
4. 클래스 + 타입 조합
5. 위치 기반 (`:nth-of-type`)

## 보안

- password 타입 필드 자동 제외
- 모든 데이터 로컬 저장 (chrome.storage.local)
- 서버 전송 없음

## 라이선스

MIT
