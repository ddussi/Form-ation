/**
 * 필드 메모리 서비스: 사용자가 직접 선택한 필드 기억 및 자동입력
 */

import { SelectorMode, type SelectorModeCallbacks } from '../../../features/field-memory/SelectorMode';
import { saveFieldMemory, generateUrlPattern } from '../../../features/field-memory';
import type { FieldData } from '../../../types/fieldMemory';

export class FieldMemoryService {
  private selectorMode: SelectorMode;

  constructor() {
    // 셀렉터 모드 초기화
    this.selectorMode = new SelectorMode({}, this.getSelectorModeCallbacks());
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
          console.log('💾 필드 데이터가 저장되었습니다');
        }
      },
    };
  }


  /**
   * 셀렉터 모드 활성화
   */
  activateSelectorMode(): void {
    if (this.selectorMode.isActivated()) {
      console.log('📝 필드 기억 모드가 이미 활성화되어 있습니다');
      return;
    }

    this.selectorMode.activate();
    console.log('📝 필드 기억 모드가 활성화되었습니다');
  }

  /**
   * 셀렉터 모드 비활성화
   */
  deactivateSelectorMode(): void {
    if (!this.selectorMode.isActivated()) {
      console.log('📝 필드 기억 모드가 활성화되어 있지 않습니다');
      return;
    }

    this.selectorMode.deactivate('cancel');
    console.log('📝 필드 기억 모드가 비활성화되었습니다');
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
        console.log('❌ 제목이 입력되지 않아 저장이 취소되었습니다');
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

      console.log(`💾 "${title}" 데이터가 저장되었습니다`);

    } catch (error) {
      console.error('[FieldMemoryService] 필드 메모리 저장 실패:', error);
      console.log('❌ 데이터 저장에 실패했습니다');
    }
  }

  destroy() {
    if (this.selectorMode?.isActivated()) {
      this.selectorMode.deactivate('cancel');
    }
  }
}
