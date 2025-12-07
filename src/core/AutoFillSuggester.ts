/**
 * 자동 입력 제안 시스템
 * - 저장된 데이터 확인
 * - 필드 매칭 검증 (셀렉터 + 타입 완전 일치)
 * - 다른 클래스들과 협업
 */

import {
  type FieldMemory,
  type FieldData,
  type AutoFillResult,
} from '../types/fieldMemory';
import {
  getFieldMemoriesByUrl,
  recordFieldMemoryUsage,
} from '../services/fieldStorage';
import { AutoFillExecutor } from './AutoFillExecutor';
import { AutoFillModal } from '../ui/AutoFillModal';

export interface AutoFillSuggesterCallbacks {
  onSuggestionFound?: (memories: FieldMemory[]) => void;
  onAutoFillComplete?: (result: AutoFillResult) => void;
  onAutoFillFailed?: (error: string) => void;
}

export class AutoFillSuggester {
  private callbacks: AutoFillSuggesterCallbacks;
  private executor: AutoFillExecutor;
  private modal: AutoFillModal;
  private isProcessing = false;

  constructor(callbacks?: AutoFillSuggesterCallbacks) {
    this.callbacks = callbacks || {};
    this.executor = new AutoFillExecutor();
    this.modal = new AutoFillModal({
      onApply: (memory) => this.handleApply(memory),
      onLater: () => this.handleLater(),
    });
  }

  /**
   * 페이지 로드 시 저장된 데이터 확인 및 제안
   */
  async checkForSavedData(): Promise<FieldMemory[]> {
    try {
      const currentUrl = window.location.href;
      const memories = await getFieldMemoriesByUrl(currentUrl);

      if (memories.length > 0) {
        console.log('[AutoFillSuggester] 저장된 필드 메모리 발견:', memories.length);

        // 유효한 메모리들만 필터링 (필드가 매칭되는 것들)
        const validMemories = this.filterValidMemories(memories);

        if (validMemories.length > 0) {
          // 가장 최근 것만 사용
          const mostRecent = validMemories[0];

          if (this.callbacks.onSuggestionFound) {
            this.callbacks.onSuggestionFound([mostRecent]);
          }

          // 자동으로 제안 모달 표시 (딜레이를 두고)
          setTimeout(() => {
            this.modal.show(mostRecent);
          }, 1000);
        }

        return validMemories;
      }

      return [];
    } catch (error) {
      console.error('[AutoFillSuggester] 저장된 데이터 확인 실패:', error);
      return [];
    }
  }

  /**
   * 유효한 메모리들 필터링 (최소 하나 이상의 필드가 완전 매칭되는 것들)
   */
  private filterValidMemories(memories: FieldMemory[]): FieldMemory[] {
    const validMemories: FieldMemory[] = [];

    for (const memory of memories) {
      const matchCount = this.countExactMatches(memory);

      if (matchCount > 0) {
        validMemories.push(memory);
      }
    }

    return validMemories;
  }

  /**
   * 완전 일치하는 필드 개수 계산
   */
  private countExactMatches(memory: FieldMemory): number {
    let count = 0;

    for (const field of memory.fields) {
      if (this.isExactMatch(field)) {
        count++;
      }
    }

    return count;
  }

  /**
   * 필드가 완전 일치하는지 확인 (셀렉터 + 타입)
   */
  private isExactMatch(field: FieldData): boolean {
    const element = document.querySelector(field.selector) as HTMLElement;

    if (!element) {
      return false;
    }

    if (!this.isInputElement(element)) {
      return false;
    }

    const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const currentType = this.getElementType(input);

    return currentType === field.type;
  }

  /**
   * 자동 입력 적용 처리
   */
  private async handleApply(memory: FieldMemory): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      // 타입이 일치하는 필드만 필터링하여 실행
      const exactMatchFields = memory.fields.filter(field => this.isExactMatch(field));

      const result = await this.executor.execute(exactMatchFields);

      if (this.callbacks.onAutoFillComplete) {
        this.callbacks.onAutoFillComplete(result);
      }

      // 사용 기록 업데이트
      await recordFieldMemoryUsage(memory.id);

    } catch (error) {
      console.error('[AutoFillSuggester] 자동 입력 실패:', error);

      if (this.callbacks.onAutoFillFailed) {
        this.callbacks.onAutoFillFailed(error instanceof Error ? error.message : '알 수 없는 오류');
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 나중에 버튼 처리
   */
  private handleLater(): void {
    console.log('[AutoFillSuggester] 사용자가 나중에를 선택함');
  }

  /**
   * 모달 숨기기 (외부에서 호출 가능)
   */
  hideSuggestionModal(): void {
    this.modal.hide();
  }

  /**
   * 입력 요소인지 확인
   */
  private isInputElement(element: HTMLElement): boolean {
    return element instanceof HTMLInputElement ||
           element instanceof HTMLTextAreaElement ||
           element instanceof HTMLSelectElement;
  }

  /**
   * 요소의 타입 반환
   */
  private getElementType(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
    if (input instanceof HTMLInputElement) {
      return input.type;
    } else if (input instanceof HTMLTextAreaElement) {
      return 'textarea';
    } else if (input instanceof HTMLSelectElement) {
      return input.multiple ? 'select-multiple' : 'select-one';
    }
    return 'text';
  }
}
