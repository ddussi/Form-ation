import { FormOrchestrator } from './FormOrchestrator';

// FormOrchestrator 인스턴스 생성
const formOrchestrator = new FormOrchestrator();

// 디버깅을 위해 전역에 노출
(window as any).formOrchestrator = formOrchestrator;

console.log('[content] Form-ation 콘텐트 스크립트 로드됨');
