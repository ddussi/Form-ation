/**
 * 자동 입력 제안 시스템: 저장된 필드 메모리를 기반으로 자동 입력을 제안
 */

import {
  type FieldMemory,
  type FieldData,
  type AutoFillResult,
  type MatchConfidence,
  MatchConfidence as MatchConfidenceValues,
} from '../../types/fieldMemory';
import {
  getFieldMemoriesByUrl,
  recordFieldMemoryUsage,
} from '../field-memory';

export interface AutoFillSuggesterCallbacks {
  onSuggestionFound?: (memories: FieldMemory[]) => void;
  onAutoFillComplete?: (result: AutoFillResult) => void;
  onAutoFillFailed?: (error: string) => void;
}

interface FieldMatch {
  memory: FieldMemory;
  field: FieldData;
  element: HTMLElement | null;
  confidence: MatchConfidence;
  reason: string;
}

export class AutoFillSuggester {
  private callbacks: AutoFillSuggesterCallbacks;
  private currentSuggestionModal: HTMLElement | null = null;
  private isProcessing = false;

  constructor(callbacks?: AutoFillSuggesterCallbacks) {
    this.callbacks = callbacks || {};
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
        
        this.callbacks.onSuggestionFound?.(memories);
        
        // 가장 적합한 메모리 선택 및 자동 입력 제안
        await this.suggestAutoFill(memories);
      }

      return memories;
    } catch (error) {
      console.error('[AutoFillSuggester] 저장된 데이터 확인 실패:', error);
      this.callbacks.onAutoFillFailed?.('저장된 데이터 확인에 실패했습니다');
      return [];
    }
  }

  /**
   * 자동 입력 제안 표시
   */
  private async suggestAutoFill(memories: FieldMemory[]): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;

    try {
      // 각 메모리에 대해 필드 매칭 시도
      const allMatches: FieldMatch[] = [];
      
      for (const memory of memories) {
        const matches = await this.matchFieldsWithMemory(memory);
        allMatches.push(...matches);
      }

      if (allMatches.length === 0) {
        console.log('[AutoFillSuggester] 매칭되는 필드 없음');
        return;
      }

      // 신뢰도 기준으로 정렬
      allMatches.sort((a, b) => {
        const confidenceOrder = {
          [MatchConfidenceValues.EXACT]: 4,
          [MatchConfidenceValues.HIGH]: 3,
          [MatchConfidenceValues.MEDIUM]: 2,
          [MatchConfidenceValues.LOW]: 1,
          [MatchConfidenceValues.FAILED]: 0,
        };
        return (confidenceOrder[b.confidence] || 0) - (confidenceOrder[a.confidence] || 0);
      });

      // 신뢰도가 높은 매칭들로 자동 입력 제안
      const bestMatches = allMatches.filter(match => 
        match.confidence === MatchConfidenceValues.EXACT || 
        match.confidence === MatchConfidenceValues.HIGH
      );

      if (bestMatches.length > 0) {
        await this.showSuggestionModal(bestMatches);
      }

    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 특정 메모리와 현재 페이지 필드들 매칭
   */
  private async matchFieldsWithMemory(memory: FieldMemory): Promise<FieldMatch[]> {
    const matches: FieldMatch[] = [];

    console.log(`[AutoFillSuggester] 메모리와 필드 매칭 시작 - ${memory.title} (${memory.fields.length}개 필드)`);

    for (const fieldData of memory.fields) {
      console.log(`[AutoFillSuggester] 필드 매칭 시도: "${fieldData.label}" (selector: ${fieldData.selector})`);
      
      const element = this.findElementBySelector(fieldData.selector);
      
      if (element) {
        const confidence = this.calculateMatchConfidence(fieldData, element);
        
        const match: FieldMatch = {
          memory,
          field: fieldData,
          element,
          confidence,
          reason: this.getMatchReason(fieldData, element, confidence)
        };
        
        matches.push(match);
        console.log(`[AutoFillSuggester] ✅ 필드 매칭 성공: "${fieldData.label}" (신뢰도: ${confidence})`);
      } else {
        console.log(`[AutoFillSuggester] ❌ 필드 매칭 실패: "${fieldData.label}" - 요소를 찾을 수 없음`);
      }
    }

    console.log(`[AutoFillSuggester] 메모리 매칭 완료: ${matches.length}/${memory.fields.length} 매칭됨`);
    return matches;
  }

  /**
   * CSS 셀렉터로 요소 찾기 (향상된 매칭 로직)
   */
  private findElementBySelector(selector: string): HTMLElement | null {
    try {
      console.log('[AutoFillSuggester] 셀렉터로 요소 찾기 시도:', selector);
      
      // 1차: 정확한 셀렉터로 시도
      let element = document.querySelector(selector) as HTMLElement;
      if (element) {
        console.log('[AutoFillSuggester] ✅ 셀렉터 매칭 성공:', selector);
        return element;
      }

      // 2차: Fallback 전략들 시도
      console.log('[AutoFillSuggester] ⚠️ 원본 셀렉터 실패, 대체 방법 시도:', selector);
      
      // name 속성 기반 매칭
      const nameMatch = selector.match(/\[name="([^"]+)"\]/);
      if (nameMatch) {
        const nameValue = nameMatch[1];
        element = document.querySelector(`input[name="${nameValue}"], textarea[name="${nameValue}"], select[name="${nameValue}"]`) as HTMLElement;
        if (element) {
          console.log('[AutoFillSuggester] ✅ name 속성으로 매칭 성공:', nameValue);
          return element;
        }
      }

      // id 속성 기반 매칭 
      const idMatch = selector.match(/#([a-zA-Z][\w-]*)/);
      if (idMatch) {
        const idValue = idMatch[1];
        element = document.getElementById(idValue) as HTMLElement;
        if (element) {
          console.log('[AutoFillSuggester] ✅ id 속성으로 매칭 성공:', idValue);
          return element;
        }
      }

      // 클래스 기반 매칭 (첫 번째 클래스만)
      const classMatch = selector.match(/\.([a-zA-Z][\w-]*)/);
      if (classMatch) {
        const className = classMatch[1];
        const elements = document.querySelectorAll(`.${className}`);
        if (elements.length === 1) {
          element = elements[0] as HTMLElement;
          if (this.isInputElement(element)) {
            console.log('[AutoFillSuggester] ✅ 클래스로 매칭 성공:', className);
            return element;
          }
        }
      }

      console.log('[AutoFillSuggester] ❌ 모든 매칭 방법 실패:', selector);
      return null;
      
    } catch (error) {
      console.warn('[AutoFillSuggester] 셀렉터 처리 에러:', selector, error);
      return null;
    }
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
   * 매칭 신뢰도 계산
   */
  private calculateMatchConfidence(fieldData: FieldData, element: HTMLElement): MatchConfidence {
    const input = element as HTMLInputElement | HTMLTextAreaElement;
    
    // 1. 타입 매칭 확인
    if (input.type !== fieldData.type) {
      return MatchConfidenceValues.LOW;
    }

    // 2. 라벨 매칭 확인 (높은 신뢰도)
    const currentLabel = this.extractFieldLabel(element);
    if (currentLabel && currentLabel === fieldData.label) {
      return MatchConfidenceValues.EXACT;
    }

    // 3. placeholder 매칭 확인
    if (input.placeholder && input.placeholder === fieldData.placeholder) {
      return MatchConfidenceValues.HIGH;
    }

    // 4. required 속성 매칭
    if (input.required === fieldData.isRequired) {
      return MatchConfidenceValues.MEDIUM;
    }

    return MatchConfidenceValues.LOW;
  }

  /**
   * 매칭 이유 텍스트 생성
   */
  private getMatchReason(_fieldData: FieldData, _element: HTMLElement, confidence: MatchConfidence): string {
    switch (confidence) {
      case MatchConfidenceValues.EXACT:
        return '라벨이 정확히 일치합니다';
      case MatchConfidenceValues.HIGH:
        return 'Placeholder와 타입이 일치합니다';
      case MatchConfidenceValues.MEDIUM:
        return '타입과 속성이 일치합니다';
      case MatchConfidenceValues.LOW:
        return '부분적으로 일치합니다';
      default:
        return '매칭 실패';
    }
  }

  /**
   * 필드 라벨 추출
   */
  private extractFieldLabel(element: HTMLElement): string {
    const input = element as HTMLInputElement | HTMLTextAreaElement;
    
    // 1. aria-label 확인
    if (input.getAttribute('aria-label')) {
      return input.getAttribute('aria-label')!;
    }

    // 2. 연결된 label 요소 확인
    if (input.id) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) {
        return label.textContent?.trim() || '';
      }
    }

    // 3. 부모 label 요소 확인
    const parentLabel = input.closest('label');
    if (parentLabel) {
      return parentLabel.textContent?.replace(input.value, '').trim() || '';
    }

    // 4. placeholder 사용
    if (input.placeholder) {
      return input.placeholder;
    }

    return '';
  }

  /**
   * 자동 입력 제안 모달 표시
   */
  private async showSuggestionModal(matches: FieldMatch[]): Promise<void> {
    if (this.currentSuggestionModal) {
      this.hideSuggestionModal();
    }

    // 그룹별로 정리 (메모리별)
    const memoryGroups = new Map<string, FieldMatch[]>();
    
    matches.forEach(match => {
      const memoryId = match.memory.id;
      if (!memoryGroups.has(memoryId)) {
        memoryGroups.set(memoryId, []);
      }
      memoryGroups.get(memoryId)!.push(match);
    });

    // 가장 좋은 그룹 선택 (매칭 수가 많고 신뢰도가 높은)
    let bestGroup: FieldMatch[] = [];
    let bestScore = 0;

    for (const group of memoryGroups.values()) {
      const score = group.length + group.filter(m => 
        m.confidence === MatchConfidenceValues.EXACT || 
        m.confidence === MatchConfidenceValues.HIGH
      ).length;
      
      if (score > bestScore) {
        bestScore = score;
        bestGroup = group;
      }
    }

    if (bestGroup.length > 0) {
      await this.createSuggestionModal(bestGroup);
    }
  }

  /**
   * 제안 모달 생성
   */
  private async createSuggestionModal(matches: FieldMatch[]): Promise<void> {
    const modal = document.createElement('div');
    modal.className = 'formation-autofill-suggestion';
    modal.innerHTML = `
      <div class="formation-suggestion-content">
        <div class="formation-suggestion-header">
          <h3>🔄 자동 입력 제안</h3>
          <button class="formation-suggestion-close">×</button>
        </div>
        <div class="formation-suggestion-body">
          <p><strong>${matches[0].memory.title}</strong>로 자동 입력하시겠습니까?</p>
          <div class="formation-suggestion-preview">
            ${matches.slice(0, 3).map(match => `
              <div class="formation-preview-item">
                <span>${match.field.label || 'Unknown'}:</span>
                <span>${match.field.value.slice(0, 20)}${match.field.value.length > 20 ? '...' : ''}</span>
              </div>
            `).join('')}
            ${matches.length > 3 ? `<div class="formation-preview-more">... 외 ${matches.length - 3}개 더</div>` : ''}
          </div>
        </div>
        <div class="formation-suggestion-actions">
          <button class="formation-btn-primary formation-autofill-confirm">자동 입력</button>
          <button class="formation-btn-secondary formation-autofill-dismiss">아니오</button>
        </div>
      </div>
    `;

    // 스타일 적용
    modal.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000000;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      min-width: 300px;
      max-width: 400px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      animation: slideInRight 0.3s ease-out;
    `;

    // 이벤트 리스너 추가
    const confirmBtn = modal.querySelector('.formation-autofill-confirm') as HTMLButtonElement;
    const dismissBtn = modal.querySelector('.formation-autofill-dismiss') as HTMLButtonElement;
    const closeBtn = modal.querySelector('.formation-suggestion-close') as HTMLButtonElement;

    confirmBtn.addEventListener('click', () => {
      this.executeAutoFill(matches);
      this.hideSuggestionModal();
    });

    dismissBtn.addEventListener('click', () => {
      this.hideSuggestionModal();
    });

    closeBtn.addEventListener('click', () => {
      this.hideSuggestionModal();
    });

    document.body.appendChild(modal);
    this.currentSuggestionModal = modal;
  }

  /**
   * 자동 입력 실행
   */
  private async executeAutoFill(matches: FieldMatch[]): Promise<void> {
    console.log(`[AutoFillSuggester] 자동입력 실행 시작 - ${matches.length}개 매칭된 필드`);
    
    let filledCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const failedFields: string[] = [];

    for (const match of matches) {
      try {
        const input = match.element as HTMLInputElement | HTMLTextAreaElement;
        const fieldName = match.field.label || match.field.selector;
        
        console.log(`[AutoFillSuggester] 필드 처리 중: "${fieldName}"`);
        
        // 이미 값이 있는 필드는 건너뛰기
        if (input.value.trim() !== '') {
          console.log(`[AutoFillSuggester] ⏭️ 기존 값 존재로 건너뛰기: "${fieldName}" (기존값: "${input.value.trim()}")`);
          skippedCount++;
          continue;
        }

        // 값 설정
        const valueToFill = match.field.value;
        console.log(`[AutoFillSuggester] 💡 값 설정 시도: "${fieldName}" = "${valueToFill}"`);
        
        input.value = valueToFill;
        
        // 이벤트 발생
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        
        filledCount++;
        
        console.log(`[AutoFillSuggester] ✅ 필드 자동 입력 성공: "${fieldName}"`);
      } catch (error) {
        const fieldName = match.field.label || match.field.selector;
        console.error(`[AutoFillSuggester] ❌ 자동 입력 실패: "${fieldName}"`, error);
        failedCount++;
        failedFields.push(fieldName);
      }
    }

    console.log(`[AutoFillSuggester] 자동입력 실행 완료 - 성공: ${filledCount}, 실패: ${failedCount}, 건너뜀: ${skippedCount}`);

    // 사용 기록 업데이트
    if (filledCount > 0) {
      const uniqueMemories = Array.from(new Set(matches.map(m => m.memory.id)));
      for (const memoryId of uniqueMemories) {
        await recordFieldMemoryUsage(memoryId);
      }
    }

    const result: AutoFillResult = {
      success: filledCount > 0,
      filledCount,
      failedCount,
      failedFields,
      message: filledCount > 0 
        ? `${filledCount}개 필드가 자동으로 입력되었습니다` 
        : `자동 입력할 수 있는 필드가 없습니다 (매칭: ${matches.length}, 건너뜀: ${skippedCount}, 실패: ${failedCount})`
    };

    console.log(`[AutoFillSuggester] 최종 결과:`, result);

    if (result.success) {
      this.callbacks.onAutoFillComplete?.(result);
    } else {
      this.callbacks.onAutoFillFailed?.(result.message);
    }
  }

  /**
   * 제안 모달 숨기기
   */
  hideSuggestionModal(): void {
    if (this.currentSuggestionModal) {
      document.body.removeChild(this.currentSuggestionModal);
      this.currentSuggestionModal = null;
    }
  }

  /**
   * 정리
   */
  destroy(): void {
    this.hideSuggestionModal();
    this.isProcessing = false;
  }
}
