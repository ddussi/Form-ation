# 🔄 Form-ation

**완성된 Chrome Extension MVP** - 폼 입력값 자동 저장 및 자동입력 시스템

## ✨ 주요 기능

🔍 **자동 폼 감지** - 웹페이지의 모든 폼을 자동으로 감지  
💾 **스마트 저장** - 폼 제출 시 브라우저 알림으로 저장 확인  
🔄 **자동입력** - 재방문 시 저장된 데이터로 자동 완성 제안  
🔔 **브라우저 알림** - 페이지 이동과 독립적인 시스템 레벨 UI  
⚙️ **관리 대시보드** - Options 페이지에서 데이터 관리  
🔒 **프라이버시** - 모든 데이터는 로컬에만 저장 (chrome.storage.local)

## 🚀 기술 스택

- **Chrome Extension MV3** + **@crxjs/vite-plugin**
- **React 19** + **TypeScript** + **Vite**
- **Chrome APIs**: notifications, storage, activeTab
- **Shadow DOM** - 스타일 격리
- **Message Passing** - Content ↔ Background Script 통신

## 🏗️ 빌드 & 실행

```bash
# 패키지 설치
pnpm install

# 개발 빌드
pnpm build

# Chrome에 로드
# chrome://extensions/ → 개발자 모드 ON → 압축해제된 확장 프로그램 로드 → dist 폴더 선택
```

## 📋 테스트

1. `test-form.html` 로컬 파일에서 기능 테스트
2. 실제 웹사이트 (네이버, 구글 등)에서 검증

## 📁 프로젝트 구조

```
src/
├── manifest.ts          # Chrome Extension 매니페스트
├── content/             # Content Script
├── background/          # Background Script (Service Worker)
├── options/             # 관리 대시보드
├── components/          # React 컴포넌트
├── utils/              # 유틸리티 함수
└── types/              # TypeScript 타입 정의
```

## 📚 문서

- `PROJECT_LOG.md` - 개발 과정 상세 기록
- `TROUBLESHOOTING.md` - 문제 해결 과정
- `PROJECT-INFO` - 이력서용 성과 요약

## 🎯 실제 사용 환경 검증

✅ **네이버 검색**: 즉시 페이지 이동하는 환경에서도 완벽한 저장  
✅ **일반 폼**: HTML 폼 표준 완벽 지원  
✅ **다중 폼**: 한 페이지 여러 폼 순차 처리  
✅ **페이지 이동**: 알림 표시 중 이동해도 안전한 저장

---

**🏆 Chrome 웹스토어 배포 준비 완료!** (번들 크기: 23.32kB)