/**
 * 필드 메모리 서비스: 사용자가 직접 선택한 필드 기억 및 자동입력
 */

import { SelectorMode, type SelectorModeCallbacks } from '../../../features/field-memory/SelectorMode';
import { AutoFillSuggester, type AutoFillSuggesterCallbacks } from '../../../features/auto-suggest';
import { saveFieldMemory, generateUrlPattern } from '../../../features/field-memory';
import { toastManager } from '../../../ui/toast';
import type { FieldData } from '../../../types/fieldMemory';

export class FieldMemoryService {
  private selectorMode: SelectorMode;
  private autoFillSuggester: AutoFillSuggester;

  constructor() {
    // 셀렉터 모드 초기화
    this.selectorMode = new SelectorMode({}, this.getSelectorModeCallbacks());
    
    // 자동 입력 제안 시스템 초기화
    this.autoFillSuggester = new AutoFillSuggester(this.getAutoFillSuggesterCallbacks());
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
        console.log('[FieldMemoryService] 셀렉터 모드 종료:', reason);
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
      onSuggestionFound: (memories) => {
        console.log('[FieldMemoryService] 자동 입력 제안 발견:', memories.length);
      },
      onAutoFillComplete: (result) => {
        console.log('[FieldMemoryService] 자동 입력 완료:', result);
        toastManager.success(`✅ ${result.filledCount}개 필드 자동 입력 완료`, 3000);
      },
      onAutoFillFailed: (error) => {
        console.error('[FieldMemoryService] 자동 입력 실패:', error);
        toastManager.error('❌ 자동 입력에 실패했습니다', 3000);
      },
    };
  }

  /**
   * 셀렉터 모드 활성화
   */
  activateSelectorMode(): void {
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
  deactivateSelectorMode(): void {
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
      
      // 사용자에게 제목 입력받기
      const title = prompt(
        '저장할 데이터의 제목을 입력하세요',
        `${new URL(currentUrl).hostname} 폼 데이터`
      );

      if (!title) {
        toastManager.warning('❌ 제목이 입력되지 않아 저장이 취소되었습니다', 3000);
        return;
      }

      // 필드 메모리 저장
      const memoryId = await saveFieldMemory({
        url: currentUrl,
        urlPattern,
        title: title.trim(),
        fields: selectedFields,
        useCount: 0,
      });

      console.log('[FieldMemoryService] 필드 메모리 저장 완료:', {
        id: memoryId,
        fieldCount: selectedFields.length,
        title,
      });

      toastManager.success(`💾 "${title}" 데이터가 저장되었습니다`, 3000);

    } catch (error) {
      console.error('[FieldMemoryService] 필드 메모리 저장 실패:', error);
      toastManager.error('❌ 데이터 저장에 실패했습니다', 3000);
    }
  }

  /**
   * 필드 메모리 기반 자동 입력 체크
   */
  async checkFieldMemoryAutoFill(): Promise<void> {
    try {
      await this.autoFillSuggester.checkForSavedData();
    } catch (error) {
      console.error('[FieldMemoryService] 필드 메모리 자동 입력 체크 실패:', error);
    }
  }

  destroy() {
    if (this.selectorMode?.isActivated()) {
      this.selectorMode.deactivate('cancel');
    }
    this.autoFillSuggester?.hideSuggestionModal();
  }
}
