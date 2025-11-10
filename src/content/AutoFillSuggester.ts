/**
 * 자동 입력 제안 시스템 (핵심 로직만)
 * - 저장된 데이터 확인
 * - 필드 매칭 검증
 * - 다른 클래스들과 협업
 */

import {
  type FieldMemory,
  type FieldData,
  type AutoFillResult,
  type MatchConfidence,
  MatchConfidence as MatchConfidenceValues,
} from '../types/fieldMemory';
import {
  getFieldMemoriesByUrl,
  recordFieldMemoryUsage,
} from '../utils/fieldStorage';
import { AutoFillExecutor } from './AutoFillExecutor';
import { AutoFillModal } from './AutoFillModal';

export interface AutoFillSuggesterCallbacks {
  onSuggestionFound?: (memories: FieldMemory[]) => void;
  onAutoFillComplete?: (result: AutoFillResult) => void;
  onAutoFillFailed?: (error: string) => void;
}

interface FieldMatch {
  field: FieldData;
  element: HTMLElement | null;
  confidence: MatchConfidence;
  reason: string;
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
        const validMemories = await this.filterValidMemories(memories);

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
   * 유효한 메모리들 필터링 (최소 하나 이상의 필드가 매칭되는 것들)
   */
  private async filterValidMemories(memories: FieldMemory[]): Promise<FieldMemory[]> {
    const validMemories: FieldMemory[] = [];

    for (const memory of memories) {
      const matches = this.findFieldMatches(memory);
      const validMatches = matches.filter(match =>
        match.element && match.confidence !== MatchConfidenceValues.FAILED
      );

      if (validMatches.length > 0) {
        validMemories.push(memory);
      }
    }

    return validMemories;
  }

  /**
   * 필드 매칭 찾기
   */
  private findFieldMatches(memory: FieldMemory): FieldMatch[] {
    const matches: FieldMatch[] = [];

    for (const field of memory.fields) {
      const element = document.querySelector(field.selector) as HTMLElement;
      let confidence: MatchConfidence = MatchConfidenceValues.FAILED;
      let reason = '셀렉터로 요소를 찾을 수 없음';

      if (element) {
        const matchResult = this.validateFieldMatch(element, field);
        confidence = matchResult.confidence;
        reason = matchResult.reason;
      }

      matches.push({
        field,
        element,
        confidence,
        reason,
      });
    }

    return matches;
  }

  /**
   * 필드 매칭 검증
   */
  private validateFieldMatch(element: HTMLElement, field: FieldData): { confidence: MatchConfidence; reason: string } {
    const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

    // 1. 요소 타입 확인
    if (!this.isInputElement(element)) {
      return { confidence: MatchConfidenceValues.FAILED, reason: '입력 요소가 아님' };
    }

    // 2. 필드 타입 매칭
    const currentType = this.getElementType(input);
    if (currentType !== field.type) {
      // 호환 가능한 타입인지 확인
      if (!this.areTypesCompatible(currentType, field.type)) {
        return { confidence: MatchConfidenceValues.LOW, reason: `타입 불일치 (${currentType} vs ${field.type})` };
      }
    }

    // 3. 라벨 유사성 확인 (선택적)
    const currentLabel = this.extractCurrentLabel(element);
    const labelSimilarity = this.calculateLabelSimilarity(currentLabel, field.label);

    // 4. 신뢰도 계산
    let confidence: MatchConfidence = MatchConfidenceValues.EXACT;
    let reason = '완전 매칭';

    if (currentType !== field.type) {
      confidence = MatchConfidenceValues.MEDIUM;
      reason = '호환 가능한 타입';
    } else if (labelSimilarity < 0.5) {
      confidence = MatchConfidenceValues.MEDIUM;
      reason = '라벨 유사성 낮음';
    } else if (labelSimilarity > 0.8) {
      confidence = MatchConfidenceValues.HIGH;
      reason = '높은 유사성';
    }

    return { confidence, reason };
  }

  /**
   * 자동 입력 적용 처리
   */
  private async handleApply(memory: FieldMemory): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      // AutoFillExecutor를 사용하여 자동 입력 실행
      const result = await this.executor.execute(memory.fields);

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
   * 유틸리티 메소드들
   */
  private isInputElement(element: HTMLElement): boolean {
    return element instanceof HTMLInputElement ||
           element instanceof HTMLTextAreaElement ||
           element instanceof HTMLSelectElement;
  }

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

  private areTypesCompatible(type1: string, type2: string): boolean {
    const compatibleGroups = [
      ['text', 'search', 'url'],
      ['email'],
      ['tel'],
      ['number'],
      ['password'],
      ['date', 'datetime-local'],
      ['textarea'],
      ['select-one', 'select-multiple'],
    ];

    return compatibleGroups.some(group =>
      group.includes(type1) && group.includes(type2)
    );
  }

  private extractCurrentLabel(element: HTMLElement): string {
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label && label.textContent) {
        return label.textContent.trim();
      }
    }

    const parentLabel = element.closest('label');
    if (parentLabel && parentLabel.textContent) {
      return parentLabel.textContent.replace(element.textContent || '', '').trim();
    }

    if (element instanceof HTMLInputElement && element.placeholder) {
      return element.placeholder;
    }

    return '';
  }

  private calculateLabelSimilarity(label1: string, label2: string): number {
    if (!label1 || !label2) return 0;

    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const norm1 = normalize(label1);
    const norm2 = normalize(label2);

    if (norm1 === norm2) return 1;
    if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.8;

    // 간단한 편집 거리 기반 유사도
    const maxLen = Math.max(norm1.length, norm2.length);
    if (maxLen === 0) return 0;

    let matches = 0;
    for (let i = 0; i < Math.min(norm1.length, norm2.length); i++) {
      if (norm1[i] === norm2[i]) matches++;
    }

    return matches / maxLen;
  }
}
