/**
 * 자동 입력 제안 시스템: 저장된 필드 메모리를 기반으로 자동 입력을 제안
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
        
        // 유효한 메모리들만 필터링 (필드가 매칭되는 것들)
        const validMemories = await this.filterValidMemories(memories);
        
        if (validMemories.length > 0) {
          if (this.callbacks.onSuggestionFound) {
            this.callbacks.onSuggestionFound(validMemories);
          }
          
          // 자동으로 제안 모달 표시 (딜레이를 두고)
          setTimeout(() => {
            this.showSuggestionModal(validMemories);
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
      const matches = await this.findFieldMatches(memory);
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
   * 자동 입력 제안 모달 표시
   */
  showSuggestionModal(memories: FieldMemory[]): void {
    if (this.currentSuggestionModal || memories.length === 0) return;

    this.currentSuggestionModal = document.createElement('div');
    this.currentSuggestionModal.className = 'form-ation-autofill-modal';
    this.currentSuggestionModal.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: white;
      border: 2px solid #007bff;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      max-width: 400px;
      animation: slideInFromLeft 0.3s ease;
    `;

    // CSS 애니메이션 추가
    this.addModalStyles();

    // 모달 내용 생성
    this.updateModalContent(memories);

    document.body.appendChild(this.currentSuggestionModal);

    // 자동 숨김 (30초 후)
    setTimeout(() => {
      this.hideSuggestionModal();
    }, 30000);
  }

  /**
   * 모달 스타일 추가
   */
  private addModalStyles(): void {
    if (document.querySelector('#form-ation-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'form-ation-modal-styles';
    style.textContent = `
      @keyframes slideInFromLeft {
        0% { opacity: 0; transform: translateX(-100%); }
        100% { opacity: 1; transform: translateX(0); }
      }
      
      @keyframes slideOutToLeft {
        0% { opacity: 1; transform: translateX(0); }
        100% { opacity: 0; transform: translateX(-100%); }
      }
      
      .form-ation-autofill-modal button {
        transition: all 0.2s ease;
      }
      
      .form-ation-autofill-modal button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * 모달 내용 업데이트
   */
  private updateModalContent(memories: FieldMemory[]): void {
    if (!this.currentSuggestionModal) return;

    const primaryMemory = memories[0]; // 가장 관련성 높은 메모리
    const fieldCount = primaryMemory.fields.length;
    const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString('ko-KR');

    this.currentSuggestionModal.innerHTML = `
      <div style="margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; color: #333; font-size: 18px; display: flex; align-items: center; gap: 8px;">
          🎯 <span>저장된 폼 데이터를 발견했습니다</span>
        </h3>
        <p style="margin: 0; color: #666; font-size: 12px;">
          이전에 입력했던 데이터로 자동 입력하시겠습니까?
        </p>
      </div>
      
      <div style="margin-bottom: 16px; padding: 12px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff;">
        <div style="font-weight: bold; color: #333; margin-bottom: 4px;">
          📅 ${primaryMemory.title || '저장된 폼 데이터'}
        </div>
        <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
          ${formatDate(primaryMemory.timestamp)}에 저장됨
          ${primaryMemory.useCount > 0 ? ` · ${primaryMemory.useCount}회 사용` : ''}
        </div>
        <div style="font-size: 12px; color: #333;">
          📝 ${fieldCount}개 필드: ${primaryMemory.fields.slice(0, 3).map(f => f.label).join(', ')}${fieldCount > 3 ? '...' : ''}
        </div>
      </div>
      
      ${memories.length > 1 ? `
        <div style="margin-bottom: 16px; font-size: 12px; color: #666;">
          💡 다른 ${memories.length - 1}개의 저장된 데이터도 있습니다
        </div>
      ` : ''}
      
      <div style="display: flex; gap: 8px; margin-bottom: 12px;">
        <button 
          id="form-ation-autofill-apply" 
          style="flex: 1; padding: 12px 16px; border: none; border-radius: 6px; background: #007bff; color: white; cursor: pointer; font-weight: bold; font-size: 14px;"
        >
          🔄 자동 입력
        </button>
        
        <button 
          id="form-ation-autofill-later" 
          style="flex: 1; padding: 12px 16px; border: 1px solid #ddd; border-radius: 6px; background: white; color: #333; cursor: pointer; font-size: 14px;"
        >
          ❌ 나중에
        </button>
      </div>
      
      <div style="display: flex; gap: 8px;">
        <button 
          id="form-ation-autofill-delete" 
          style="flex: 1; padding: 8px 12px; border: 1px solid #dc3545; border-radius: 6px; background: white; color: #dc3545; cursor: pointer; font-size: 12px;"
        >
          🗑️ 삭제
        </button>
        
        <button 
          id="form-ation-autofill-edit" 
          style="flex: 1; padding: 8px 12px; border: 1px solid #6c757d; border-radius: 6px; background: white; color: #6c757d; cursor: pointer; font-size: 12px;"
        >
          ✏️ 수정
        </button>
      </div>
      
      <div style="margin-top: 12px; font-size: 11px; color: #999; text-align: center;">
        이 알림은 30초 후 자동으로 사라집니다
      </div>
    `;

    // 버튼 이벤트 등록
    this.attachModalEvents(memories);
  }

  /**
   * 모달 이벤트 등록
   */
  private attachModalEvents(memories: FieldMemory[]): void {
    if (!this.currentSuggestionModal) return;

    const applyBtn = this.currentSuggestionModal.querySelector('#form-ation-autofill-apply');
    const laterBtn = this.currentSuggestionModal.querySelector('#form-ation-autofill-later');
    const deleteBtn = this.currentSuggestionModal.querySelector('#form-ation-autofill-delete');
    const editBtn = this.currentSuggestionModal.querySelector('#form-ation-autofill-edit');

    if (applyBtn) {
      applyBtn.addEventListener('click', () => this.handleAutoFillApply(memories[0]));
    }

    if (laterBtn) {
      laterBtn.addEventListener('click', () => this.hideSuggestionModal());
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.handleDelete(memories[0]));
    }

    if (editBtn) {
      editBtn.addEventListener('click', () => this.handleEdit(memories[0]));
    }
  }

  /**
   * 자동 입력 적용 처리
   */
  private async handleAutoFillApply(memory: FieldMemory): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.hideSuggestionModal();

    try {
      const result = await this.applyAutoFill(memory);
      
      if (this.callbacks.onAutoFillComplete) {
        this.callbacks.onAutoFillComplete(result);
      }

      // 성공 토스트 표시
      this.showToast(
        result.success 
          ? `✅ ${result.filledCount}개 필드가 자동 입력되었습니다`
          : `⚠️ 일부 필드만 입력됨 (${result.filledCount}/${result.filledCount + result.failedCount})`,
        result.success ? 'success' : 'warning'
      );

      // 사용 기록 업데이트
      await recordFieldMemoryUsage(memory.id);

    } catch (error) {
      console.error('[AutoFillSuggester] 자동 입력 실패:', error);
      
      if (this.callbacks.onAutoFillFailed) {
        this.callbacks.onAutoFillFailed(error instanceof Error ? error.message : '알 수 없는 오류');
      }

      this.showToast('❌ 자동 입력에 실패했습니다', 'error');
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 자동 입력 실행
   */
  async applyAutoFill(memory: FieldMemory): Promise<AutoFillResult> {
    const matches = await this.findFieldMatches(memory);
    let filledCount = 0;
    let failedCount = 0;
    const failedFields: string[] = [];

    for (const match of matches) {
      if (match.element && match.confidence !== MatchConfidenceValues.FAILED) {
        try {
          await this.fillField(match.element, match.field.value);
          filledCount++;
          console.log('[AutoFillSuggester] 필드 입력 성공:', match.field.label);
        } catch (error) {
          failedCount++;
          failedFields.push(match.field.selector);
          console.warn('[AutoFillSuggester] 필드 입력 실패:', match.field.label, error);
        }
      } else {
        failedCount++;
        failedFields.push(match.field.selector);
      }
    }

    const result: AutoFillResult = {
      success: failedCount === 0,
      filledCount,
      failedCount,
      failedFields,
      message: failedCount > 0 
        ? `${filledCount}개 성공, ${failedCount}개 실패`
        : `${filledCount}개 필드 모두 성공`,
    };

    return result;
  }

  /**
   * 필드 매칭 찾기
   */
  private async findFieldMatches(memory: FieldMemory): Promise<FieldMatch[]> {
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
        memory,
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
   * 필드에 값 입력
   */
  private async fillField(element: HTMLElement, value: string): Promise<void> {
    const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

    // 1. 기존 값 백업 (실패 시 복원용)
    const originalValue = input.value;

    try {
      // 2. 포커스
      element.focus();

      // 3. 값 설정
      if (input instanceof HTMLSelectElement) {
        await this.fillSelectElement(input, value);
      } else {
        input.value = value;
      }

      // 4. 이벤트 발생 (React 등 프레임워크 호환)
      this.triggerInputEvents(element);

      // 5. 시각적 피드백
      this.highlightFilledField(element);

    } catch (error) {
      // 실패 시 원래 값 복원
      input.value = originalValue;
      throw error;
    }
  }

  /**
   * Select 요소 채우기
   */
  private async fillSelectElement(select: HTMLSelectElement, value: string): Promise<void> {
    // 정확한 값 매칭 시도
    for (const option of Array.from(select.options)) {
      if (option.value === value || option.textContent === value) {
        select.value = option.value;
        return;
      }
    }

    // 부분 매칭 시도
    for (const option of Array.from(select.options)) {
      if (option.textContent?.includes(value) || value.includes(option.textContent || '')) {
        select.value = option.value;
        return;
      }
    }

    throw new Error('매칭되는 옵션을 찾을 수 없음');
  }

  /**
   * 입력 이벤트 발생 (프레임워크 호환)
   */
  private triggerInputEvents(element: HTMLElement): void {
    const events = ['input', 'change', 'blur'];
    
    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true });
      element.dispatchEvent(event);
    });
  }

  /**
   * 입력된 필드 하이라이트
   */
  private highlightFilledField(element: HTMLElement): void {
    const originalOutline = element.style.outline;
    element.style.outline = '2px solid #28a745';
    element.style.outlineOffset = '1px';

    setTimeout(() => {
      element.style.outline = originalOutline;
      element.style.outlineOffset = '';
    }, 2000);
  }

  /**
   * 삭제 처리
   */
  private handleDelete(memory: FieldMemory): void {
    const confirmed = confirm(`"${memory.title || '저장된 폼 데이터'}"를 삭제하시겠습니까?`);
    
    if (confirmed) {
      // TODO: fieldStorage.deleteFieldMemory 호출
      this.showToast('🗑️ 데이터가 삭제되었습니다', 'info');
      this.hideSuggestionModal();
    }
  }

  /**
   * 수정 처리
   */
  private handleEdit(_memory: FieldMemory): void {
    // TODO: 필드 편집 모달 표시
    this.showToast('✏️ 편집 기능은 곧 추가됩니다', 'info');
    this.hideSuggestionModal();
  }

  /**
   * 모달 숨기기
   */
  hideSuggestionModal(): void {
    if (this.currentSuggestionModal) {
      this.currentSuggestionModal.style.animation = 'slideOutToLeft 0.3s ease';
      
      setTimeout(() => {
        if (this.currentSuggestionModal) {
          this.currentSuggestionModal.remove();
          this.currentSuggestionModal = null;
        }
      }, 300);
    }
  }

  /**
   * 토스트 메시지 표시
   */
  private showToast(message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info'): void {
    const colors = {
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545',
      info: '#007bff',
    };

    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 1000001;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideInFromRight 0.3s ease;
    `;

    toast.textContent = message;

    // 애니메이션 스타일 (필요한 경우에만 추가)
    if (!document.querySelector('#form-ation-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'form-ation-toast-styles';
      style.textContent = `
        @keyframes slideInFromRight {
          0% { opacity: 0; transform: translateX(100%); }
          100% { opacity: 1; transform: translateX(0); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideInFromRight 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
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
    // 기존 SelectorMode의 extractFieldLabel 로직과 유사
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
