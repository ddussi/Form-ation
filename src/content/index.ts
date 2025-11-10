import { toastManager } from '../utils/toastManager';
import { SelectorMode, type SelectorModeCallbacks } from './SelectorMode';
import { AutoFillSuggester, type AutoFillSuggesterCallbacks } from './AutoFillSuggester';
import { saveFieldMemory, generateUrlPattern } from '../utils/fieldStorage';
import type { FieldMemory, FieldData } from '../types/fieldMemory';

class FormManager {
  private isInitialized = false;

  // 셀렉터 모드 시스템
  private selectorMode: SelectorMode;
  private autoFillSuggester: AutoFillSuggester;

  constructor() {
    // 셀렉터 모드 초기화
    this.selectorMode = new SelectorMode({}, this.getSelectorModeCallbacks());

    // 자동 입력 제안 시스템 초기화
    this.autoFillSuggester = new AutoFillSuggester(this.getAutoFillSuggesterCallbacks());

    this.init();
  }

  private init() {
    // DOM이 완전히 로드된 후 실행
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  private initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log('[FormManager] 초기화 시작...');
    this.setupMessageListener();

    // 자동 입력 제안 체크 (폼 감지 후 약간의 딜레이)
    setTimeout(() => {
      this.checkFieldMemoryAutoFill();
    }, 500);
  }

  private setupMessageListener() {
    // Background script에서 보내는 메시지 처리
    chrome.runtime.onMessage.addListener((message: any) => {
      if (message?.type === 'ACTIVATE_SELECTOR_MODE') {
        // 셀렉터 모드 활성화 요청
        console.log('[FormManager] 셀렉터 모드 활성화 요청');
        this.activateSelectorMode();
      } else if (message?.type === 'DEACTIVATE_SELECTOR_MODE') {
        // 셀렉터 모드 비활성화 요청
        console.log('[FormManager] 셀렉터 모드 비활성화 요청');
        this.deactivateSelectorMode();
      }
    });
  }

  /**
   * 셀렉터 모드 콜백 함수들
   */
  private getSelectorModeCallbacks(): SelectorModeCallbacks {
    return {
      onSelectionComplete: (selectedFields: FieldData[]) => {
        this.handleFieldSelectionComplete(selectedFields);
      },
      onModeExit: (reason) => {
        console.log('[FormManager] 셀렉터 모드 종료:', reason);
        if (reason === 'save') {
          toastManager.success('💾 필드 데이터가 저장되었습니다', 3000);
        }
      },
    };
  }

  /**
   * 자동 입력 제안 콜백 함수들
   */
  private getAutoFillSuggesterCallbacks(): AutoFillSuggesterCallbacks {
    return {
      onSuggestionFound: (memories: FieldMemory[]) => {
        console.log('[FormManager] 자동 입력 제안 발견:', memories.length);
      },
      onAutoFillComplete: (result) => {
        console.log('[FormManager] 자동 입력 완료:', result);
        toastManager.success(`✅ ${result.filledCount}개 필드 자동 입력 완료`, 3000);
      },
      onAutoFillFailed: (error) => {
        console.error('[FormManager] 자동 입력 실패:', error);
        toastManager.error('❌ 자동 입력에 실패했습니다', 3000);
      },
    };
  }

  /**
   * 셀렉터 모드 활성화
   */
  private activateSelectorMode(): void {
    if (this.selectorMode.isActivated()) {
      toastManager.warning('📝 필드 기억 모드가 이미 활성화되어 있습니다', 2000);
      return;
    }

    this.selectorMode.activate();
    toastManager.info('📝 필드 기억 모드가 활성화되었습니다', 2000);
  }

  /**
   * 셀렉터 모드 비활성화
   */
  private deactivateSelectorMode(): void {
    if (!this.selectorMode.isActivated()) {
      toastManager.warning('📝 필드 기억 모드가 활성화되어 있지 않습니다', 2000);
      return;
    }

    this.selectorMode.deactivate('cancel');
    toastManager.info('📝 필드 기억 모드가 비활성화되었습니다', 2000);
  }

  /**
   * 필드 선택 완료 처리
   */
  private async handleFieldSelectionComplete(selectedFields: FieldData[]): Promise<void> {
    try {
      const currentUrl = window.location.href;
      const urlPattern = generateUrlPattern(currentUrl);

      // 제목을 URL로 자동 생성
      const title = currentUrl;

      // 필드 메모리 저장
      const memoryId = await saveFieldMemory({
        url: currentUrl,
        urlPattern,
        title,
        fields: selectedFields,
        useCount: 0,
      });

      console.log('[FormManager] 필드 메모리 저장 완료:', {
        id: memoryId,
        fieldCount: selectedFields.length,
        title,
      });

      toastManager.success(`💾 "${title}" 데이터가 저장되었습니다`, 3000);

    } catch (error) {
      console.error('[FormManager] 필드 메모리 저장 실패:', error);
      toastManager.error('❌ 데이터 저장에 실패했습니다', 3000);
    }
  }

  /**
   * 필드 메모리 기반 자동 입력 체크
   */
  private async checkFieldMemoryAutoFill(): Promise<void> {
    try {
      await this.autoFillSuggester.checkForSavedData();
    } catch (error) {
      console.error('[FormManager] 필드 메모리 자동 입력 체크 실패:', error);
    }
  }

  public destroy() {
    // 새로운 시스템 정리
    if (this.selectorMode?.isActivated()) {
      this.selectorMode.deactivate('cancel');
    }
    this.autoFillSuggester?.hideSuggestionModal();
  }
}

// FormManager 인스턴스 생성
const formManager = new FormManager();

// 디버깅을 위해 전역에 노출
(window as any).formManager = formManager;

console.log('[content] Form-ation 콘텐트 스크립트 로드됨');
