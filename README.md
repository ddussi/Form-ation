# Form-ation

Chrome 확장 프로그램으로 구현한 웹 폼 자동저장 및 자동입력 시스템입니다.

## 핵심 기능

### 사용자 주도적 저장 시스템
- 기본 OFF 상태로 불필요한 알림 방지
- 확장 아이콘 클릭으로 저장 모드 ON/OFF 전환
- 저장 완료 후 자동으로 OFF 상태 복귀

### 폼 처리 기능
- `<form>` 태그 및 페이지 레벨 입력 필드 자동 감지
- 한 페이지 내 다중 폼 순차 처리
- name/id 기반 정확한 필드 매칭으로 자동입력

### 브라우저 알림 시스템  
- Chrome Notifications API를 활용한 페이지 독립적 알림
- 네이버 검색 등 즉시 페이지 이동 환경에서도 정상 동작
- `requireInteraction` 옵션으로 데이터 손실 방지

### 보안 및 프라이버시
- 모든 데이터는 `chrome.storage.local`에만 저장
- password 타입 필드 자동 제외
- Shadow DOM으로 웹사이트 스타일 간섭 차단

## 해결한 주요 문제

| 문제 | 해결 방법 |
|------|----------|
| 폼 제출 시 페이지 이동으로 저장 기회 상실 | 브라우저 알림으로 페이지 독립적 저장 |
| 모든 폼에서 불필요한 저장 확인 요청 | 사용자 주도적 ON/OFF 모드 |
| 다중 폼 페이지에서 일부만 처리됨 | 큐 기반 순차 처리 시스템 |
| 기존 입력값 덮어쓰기 우려 | 기존 값 보호 로직 |

## 기술 스택

### 프레임워크 및 빌드
- React 19 + TypeScript + Vite + SWC
- Chrome Extension Manifest v3
- @crxjs/vite-plugin (v2.2.0)

### 개발 도구
- ESLint (strict) + Prettier
- pnpm (v10.15.0)
- WSL + nvm

### Chrome APIs
- `chrome.notifications` - 브라우저 레벨 알림
- `chrome.storage.local` - 로컬 데이터 저장
- `chrome.action` - 확장 아이콘 제어
- Message Passing - Content ↔ Background Script 통신

## 설치 및 사용법

### 설치 방법

**Option 1: Chrome 웹스토어 (권장)**
```
Chrome 웹스토어에서 "Form-ation" 검색 후 설치
```

**Option 2: 개발자 모드 설치**
```bash
# 1. 소스 코드 다운로드 및 빌드
git clone <repository>
cd Form-ation
pnpm install
pnpm build

# 2. Chrome에 수동 로드
# chrome://extensions/ → 개발자 모드 ON → 압축해제된 확장 프로그램 로드 → dist 폴더 선택
```

### 사용법

1. 확장 프로그램 설치 후 브라우저 상단의 Form-ation 아이콘 확인
2. 폼 작성 시 저장하고 싶다면 아이콘 클릭으로 저장 모드 활성화 (빨간 "ON" 배지 표시)
3. 폼 제출 시 브라우저 알림으로 저장 확인
4. 재방문 시 자동으로 자동입력 제안 모달 표시

### 관리 대시보드
- 우클릭 → 확장 프로그램 옵션 또는 `chrome://extensions/`에서 Options 클릭
- 저장된 데이터 조회/삭제, 사이트별 설정 관리

## 프로젝트 구조

```
src/
├── manifest.ts              # Chrome Extension 설정
├── background/              # Service Worker (알림, 저장 처리)
│   └── index.ts
├── content/                 # Content Script (폼 감지, UI)
│   ├── index.ts
│   └── ModalManager.tsx
├── options/                 # 관리 대시보드 페이지
│   ├── index.html
│   ├── main.tsx
│   └── options.css
├── components/              # 공통 UI 컴포넌트
│   ├── AutofillConfirmModal.tsx
│   ├── SaveConfirmModal.tsx
│   └── Toast.tsx
├── utils/                   # 핵심 비즈니스 로직
│   ├── formDetection.ts     # 폼/필드 감지
│   ├── fieldFiltering.ts    # 민감값 필터링
│   ├── storage.ts           # 데이터 저장/조회
│   ├── autofill.ts          # 자동입력 처리
│   ├── browserNotification.ts # 브라우저 알림
│   └── notificationBridge.ts   # Content-Background 통신
└── types/                   # TypeScript 타입 정의
    └── form.ts
```

## 테스트 환경

### 검증된 실제 사용 환경
- 네이버 검색 - 즉시 페이지 이동하는 환경에서도 정상 저장
- 구글 폼 - 복잡한 다단계 폼에서 정상 동작
- 일반 웹사이트 - HTML 폼 표준 지원
- 다중 폼 페이지 - 여러 폼 순차 처리

## 기술 성과

### 핵심 지표
- 번들 크기: 23.32kB
- TypeScript 100% 적용
- Chrome Extension MV3 표준 준수

### 아키텍처
- Message Passing 패턴으로 Content ↔ Background Script 통신
- Shadow DOM을 통한 웹사이트 스타일 간섭 차단
- Content Script (UI) / Background Script (Logic) 역할 분리
- 모듈형 설계로 확장 가능

---

**완성된 Chrome Extension MVP** (v1.0.0)