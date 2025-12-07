/**
 * 셀렉터 모드: 사용자가 저장할 필드들을 직접 선택하는 인터페이스
 */

import type {
  FieldData,
  FieldSelectionState,
  SelectorModeOptions,
} from '../types/fieldMemory';
import {
  DEFAULT_SELECTOR_MODE_OPTIONS,
} from '../types/fieldMemory';

export interface SelectorModeCallbacks {
  onFieldSelected?: (field: FieldSelectionState) => void;
  onFieldDeselected?: (field: FieldSelectionState) => void;
  onSelectionComplete?: (selectedFields: FieldData[]) => void;
  onModeExit?: (reason: 'save' | 'cancel' | 'escape') => void;
}

export class SelectorMode {
  private isActive = false;
  private selectedFields = new Map<HTMLElement, FieldSelectionState>();
  private selectableFields = new Set<HTMLElement>();
  private overlay: HTMLElement | null = null;
  private controlPanel: HTMLElement | null = null;
  private options: SelectorModeOptions;
  private callbacks: SelectorModeCallbacks;
  
  // 이벤트 리스너 저장 (제거를 위해)
  private boundHandlers = {
    handleFieldClick: this.handleFieldClick.bind(this),
    handleFieldHover: this.handleFieldHover.bind(this),
    handleKeyPress: this.handleKeyPress.bind(this),
  };

  constructor(options?: Partial<SelectorModeOptions>, callbacks?: SelectorModeCallbacks) {
    this.options = { ...DEFAULT_SELECTOR_MODE_OPTIONS, ...options };
    this.callbacks = callbacks || {};
  }

  /**
   * 셀렉터 모드 활성화
   */
  activate(): void {
    if (this.isActive) return;

    console.log('[SelectorMode] 셀렉터 모드 활성화');
    this.isActive = true;

    // 1. 선택 가능한 필드들 찾기
    this.findSelectableFields();

    // 2. 오버레이 및 UI 생성
    this.createOverlay();
    this.createControlPanel();

    // 3. 이벤트 리스너 등록
    this.attachEventListeners();

    // 4. 필드들에 하이라이트 적용
    this.applyFieldHighlights();

    // 5. 시각적 피드백
    this.showActivationFeedback();
  }

  /**
   * 셀렉터 모드 비활성화
   */
  deactivate(reason: 'save' | 'cancel' | 'escape' = 'cancel'): void {
    if (!this.isActive) return;

    console.log('[SelectorMode] 셀렉터 모드 비활성화:', reason);
    this.isActive = false;

    // 1. 이벤트 리스너 제거
    this.detachEventListeners();

    // 2. UI 요소 제거
    this.removeOverlay();
    this.removeControlPanel();

    // 3. 하이라이트 제거
    this.removeFieldHighlights();

    // 4. 상태 초기화
    this.selectedFields.clear();
    this.selectableFields.clear();

    // 5. 콜백 호출
    if (this.callbacks.onModeExit) {
      this.callbacks.onModeExit(reason);
    }
  }

  /**
   * 현재 선택된 필드들 반환
   */
  getSelectedFields(): FieldData[] {
    return Array.from(this.selectedFields.values()).map(state => state.fieldData);
  }

  /**
   * 선택 상태 확인
   */
  isFieldSelected(element: HTMLElement): boolean {
    return this.selectedFields.has(element);
  }

  /**
   * 활성 상태 확인
   */
  isActivated(): boolean {
    return this.isActive;
  }

  /**
   * 선택 가능한 필드들 찾기
   */
  private findSelectableFields(): void {
    this.selectableFields.clear();

    // 모든 입력 요소들 찾기
    const inputElements = document.querySelectorAll('input, textarea, select');

    inputElements.forEach(element => {
      const htmlElement = element as HTMLElement;
      
      if (this.isFieldSelectable(htmlElement)) {
        this.selectableFields.add(htmlElement);
      }
    });

    console.log('[SelectorMode] 선택 가능한 필드 수:', this.selectableFields.size);
  }

  /**
   * 필드가 선택 가능한지 확인
   */
  private isFieldSelectable(element: HTMLElement): boolean {
    const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

    // 1. 기본 검증
    if (!element.isConnected || element.hidden || element.style.display === 'none') {
      return false;
    }

    // 2. 타입 검증
    if (input instanceof HTMLInputElement) {
      if (this.options.excludeTypes.includes(input.type)) {
        return false;
      }
    }

    // 3. 셀렉터 제외 확인
    for (const excludeSelector of this.options.excludeSelectors) {
      if (element.matches(excludeSelector)) {
        return false;
      }
    }

    // 4. 읽기 전용 확인
    if (input.disabled) {
      return false;
    }
    
    // readOnly는 HTMLInputElement와 HTMLTextAreaElement에만 존재
    if ((input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) && input.readOnly) {
      return false;
    }

    // 5. 크기 확인 (너무 작은 요소 제외)
    const rect = element.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) {
      return false;
    }

    return true;
  }

  /**
   * 오버레이 생성
   */
  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.className = 'form-ation-selector-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      z-index: 999998;
      pointer-events: none;
    `;

    document.body.appendChild(this.overlay);
  }

  /**
   * 컨트롤 패널 생성
   */
  private createControlPanel(): void {
    this.controlPanel = document.createElement('div');
    this.controlPanel.className = 'form-ation-control-panel';
    this.controlPanel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border: 2px solid ${this.options.highlightColor};
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      min-width: 280px;
    `;

    this.updateControlPanelContent();
    document.body.appendChild(this.controlPanel);
  }

  /**
   * 컨트롤 패널 내용 업데이트
   */
  private updateControlPanelContent(): void {
    if (!this.controlPanel) return;

    const selectedCount = this.selectedFields.size;
    const totalCount = this.selectableFields.size;

    this.controlPanel.innerHTML = `
      <div style="margin-bottom: 12px;">
        <h3 style="margin: 0 0 8px 0; color: #333; font-size: 16px;">
          📝 필드 기억 모드
        </h3>
        <p style="margin: 0; color: #666; font-size: 12px;">
          저장할 입력 필드들을 클릭하세요
        </p>
      </div>
      
      <div style="margin-bottom: 16px; padding: 8px; background: #f8f9fa; border-radius: 4px;">
        <div style="font-weight: bold; color: #333;">
          선택됨: ${selectedCount}개 / ${totalCount}개
        </div>
      </div>
      
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button 
          id="form-ation-preview-btn" 
          style="flex: 1; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; font-size: 12px;"
          ${selectedCount === 0 ? 'disabled' : ''}
        >
          🔍 미리보기
        </button>
        
        <button 
          id="form-ation-save-btn" 
          style="flex: 1; padding: 8px 12px; border: 1px solid ${this.options.selectedColor}; border-radius: 4px; background: ${this.options.selectedColor}; color: white; cursor: pointer; font-size: 12px; font-weight: bold;"
          ${selectedCount === 0 ? 'disabled' : ''}
        >
          💾 저장
        </button>
        
        <button 
          id="form-ation-cancel-btn" 
          style="flex: 1; padding: 8px 12px; border: 1px solid #dc3545; border-radius: 4px; background: #dc3545; color: white; cursor: pointer; font-size: 12px;"
        >
          ❌ 취소
        </button>
      </div>
      
      <div style="margin-top: 12px; font-size: 11px; color: #999; text-align: center;">
        ESC 키로 취소 | 선택된 필드를 다시 클릭하면 해제
      </div>
    `;

    // 버튼 이벤트 등록
    this.attachControlPanelEvents();
  }

  /**
   * 컨트롤 패널 이벤트 등록
   */
  private attachControlPanelEvents(): void {
    if (!this.controlPanel) return;

    const previewBtn = this.controlPanel.querySelector('#form-ation-preview-btn');
    const saveBtn = this.controlPanel.querySelector('#form-ation-save-btn');
    const cancelBtn = this.controlPanel.querySelector('#form-ation-cancel-btn');

    if (previewBtn) {
      previewBtn.addEventListener('click', () => this.showPreview());
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.handleSave());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.deactivate('cancel'));
    }
  }

  /**
   * 필드 하이라이트 적용
   */
  private applyFieldHighlights(): void {
    this.selectableFields.forEach(element => {
      this.addHighlight(element, 'selectable');
    });
  }

  /**
   * 필드 하이라이트 제거
   */
  private removeFieldHighlights(): void {
    this.selectableFields.forEach(element => {
      this.removeHighlight(element);
    });

    this.selectedFields.forEach((_, element) => {
      this.removeHighlight(element);
    });
  }

  /**
   * 개별 필드에 하이라이트 추가
   */
  private addHighlight(element: HTMLElement, type: 'selectable' | 'selected'): void {
    const color = type === 'selected' ? this.options.selectedColor : this.options.highlightColor;
    const style = type === 'selected' ? 'solid' : 'dashed';

    element.style.outline = `2px ${style} ${color}`;
    element.style.outlineOffset = '1px';
    element.style.transition = 'outline 0.2s ease';

    // 선택된 필드에 체크 아이콘 추가
    if (type === 'selected') {
      this.addCheckIcon(element);
    }
  }

  /**
   * 하이라이트 제거
   */
  private removeHighlight(element: HTMLElement): void {
    element.style.outline = '';
    element.style.outlineOffset = '';
    element.style.transition = '';
    this.removeCheckIcon(element);
  }

  /**
   * 체크 아이콘 추가
   */
  private addCheckIcon(element: HTMLElement): void {
    const existingIcon = element.parentElement?.querySelector('.form-ation-check-icon');
    if (existingIcon) return;

    const icon = document.createElement('div');
    icon.className = 'form-ation-check-icon';
    icon.style.cssText = `
      position: absolute;
      top: -8px;
      right: -8px;
      width: 20px;
      height: 20px;
      background: ${this.options.selectedColor};
      border: 2px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: bold;
      z-index: 999999;
      pointer-events: none;
    `;
    icon.textContent = '✓';

    // 부모 요소의 position이 static이면 relative로 변경
    const parent = element.parentElement;
    if (parent && getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    element.parentElement?.appendChild(icon);
  }

  /**
   * 체크 아이콘 제거
   */
  private removeCheckIcon(element: HTMLElement): void {
    const icon = element.parentElement?.querySelector('.form-ation-check-icon');
    if (icon) {
      icon.remove();
    }
  }

  /**
   * 이벤트 리스너 등록
   */
  private attachEventListeners(): void {
    document.addEventListener('click', this.boundHandlers.handleFieldClick, true);
    document.addEventListener('mouseover', this.boundHandlers.handleFieldHover, true);
    document.addEventListener('keydown', this.boundHandlers.handleKeyPress, true);
  }

  /**
   * 이벤트 리스너 제거
   */
  private detachEventListeners(): void {
    document.removeEventListener('click', this.boundHandlers.handleFieldClick, true);
    document.removeEventListener('mouseover', this.boundHandlers.handleFieldHover, true);
    document.removeEventListener('keydown', this.boundHandlers.handleKeyPress, true);
  }

  /**
   * 필드 클릭 처리
   */
  private handleFieldClick(event: MouseEvent): void {
    if (!this.isActive) return;

    const target = event.target as HTMLElement;

    // 컨트롤 패널 클릭은 무시
    if (this.controlPanel?.contains(target)) return;

    // 선택 가능한 필드인지 확인
    if (this.selectableFields.has(target)) {
      event.preventDefault();
      event.stopPropagation();

      if (this.selectedFields.has(target)) {
        this.deselectField(target);
      } else {
        this.selectField(target);
      }
    }
  }

  /**
   * 필드 호버 처리
   */
  private handleFieldHover(event: MouseEvent): void {
    if (!this.isActive) return;

    const target = event.target as HTMLElement;

    if (this.selectableFields.has(target) && !this.selectedFields.has(target)) {
      // 호버 효과 (임시 하이라이트 강조)
      target.style.outlineWidth = '3px';
      
      setTimeout(() => {
        if (!this.selectedFields.has(target)) {
          target.style.outlineWidth = '2px';
        }
      }, 200);
    }
  }

  /**
   * 키보드 이벤트 처리
   */
  private handleKeyPress(event: KeyboardEvent): void {
    if (!this.isActive) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.deactivate('escape');
    }
  }

  /**
   * 필드 선택
   */
  private selectField(element: HTMLElement): void {
    const fieldData = this.extractFieldInfo(element);
    const selector = this.generateSelector(element);

    const selectionState: FieldSelectionState = {
      element,
      selector,
      fieldData: { ...fieldData, selector },
      isSelected: true,
    };

    this.selectedFields.set(element, selectionState);
    this.addHighlight(element, 'selected');
    this.updateControlPanelContent();

    console.log('[SelectorMode] 필드 선택됨:', fieldData.label || selector);

    if (this.callbacks.onFieldSelected) {
      this.callbacks.onFieldSelected(selectionState);
    }
  }

  /**
   * 필드 선택 해제
   */
  private deselectField(element: HTMLElement): void {
    const selectionState = this.selectedFields.get(element);
    if (!selectionState) return;

    this.selectedFields.delete(element);
    this.addHighlight(element, 'selectable'); // 다시 선택 가능 상태로
    this.updateControlPanelContent();

    console.log('[SelectorMode] 필드 선택 해제됨:', selectionState.fieldData.label);

    if (this.callbacks.onFieldDeselected) {
      this.callbacks.onFieldDeselected(selectionState);
    }
  }

  /**
   * CSS 셀렉터 생성
   */
  private generateSelector(element: HTMLElement): string {
    const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

    // 전략 1: name 속성
    if (input.name) {
      return `${element.tagName.toLowerCase()}[name="${input.name}"]`;
    }

    // 전략 2: id 속성
    if (element.id) {
      return `#${element.id}`;
    }

    // 전략 3: 클래스 + 타입
    if (element.className && input instanceof HTMLInputElement) {
      const firstClass = element.className.split(' ')[0];
      return `input.${firstClass}[type="${input.type}"]`;
    }

    // 전략 4: 클래스만
    if (element.className) {
      const firstClass = element.className.split(' ')[0];
      return `${element.tagName.toLowerCase()}.${firstClass}`;
    }

    // 전략 5: 위치 기반 (nth-of-type)
    return this.generatePositionalSelector(element);
  }

  /**
   * 위치 기반 셀렉터 생성
   */
  private generatePositionalSelector(element: HTMLElement): string {
    const tagName = element.tagName.toLowerCase();
    const parent = element.parentElement;

    if (!parent) {
      return tagName;
    }

    const siblings = Array.from(parent.children).filter(
      child => child.tagName.toLowerCase() === tagName
    );

    const index = siblings.indexOf(element);
    if (index >= 0) {
      return `${tagName}:nth-of-type(${index + 1})`;
    }

    return tagName;
  }

  /**
   * 필드 정보 추출
   */
  private extractFieldInfo(element: HTMLElement): Omit<FieldData, 'selector'> {
    const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    
    return {
      value: input.value || '',
      label: this.extractFieldLabel(element),
      type: this.getFieldType(input),
      placeholder: (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) ? input.placeholder || undefined : undefined,
      isRequired: input.required || false,
      maxLength: input instanceof HTMLInputElement ? input.maxLength : undefined,
    };
  }

  /**
   * 필드 라벨 추출
   */
  private extractFieldLabel(element: HTMLElement): string {
    // 1. label 태그 찾기
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label && label.textContent) {
        return label.textContent.trim();
      }
    }

    // 2. 부모 label 확인
    const parentLabel = element.closest('label');
    if (parentLabel && parentLabel.textContent) {
      return parentLabel.textContent.replace(element.textContent || '', '').trim();
    }

    // 3. placeholder 사용
    if (element instanceof HTMLInputElement && element.placeholder) {
      return element.placeholder;
    }

    // 4. name 속성 사용
    if (element instanceof HTMLInputElement && element.name) {
      return element.name;
    }

    // 5. 이전 텍스트 노드 찾기
    const prevText = this.findPreviousText(element);
    if (prevText) {
      return prevText;
    }

    // 6. 폴백: 태그명 + 타입
    const input = element as HTMLInputElement;
    return `${element.tagName.toLowerCase()}${input.type ? `[${input.type}]` : ''}`;
  }

  /**
   * 이전 텍스트 노드 찾기
   */
  private findPreviousText(element: HTMLElement): string {
    let current = element.previousSibling;
    
    while (current) {
      if (current.nodeType === Node.TEXT_NODE && current.textContent?.trim()) {
        return current.textContent.trim();
      }
      
      if (current.nodeType === Node.ELEMENT_NODE) {
        const text = (current as Element).textContent?.trim();
        if (text && text.length < 50) { // 너무 긴 텍스트는 제외
          return text;
        }
      }
      
      current = current.previousSibling;
    }
    
    return '';
  }

  /**
   * 필드 타입 결정
   */
  private getFieldType(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
    if (input instanceof HTMLInputElement) {
      return input.type;
    } else if (input instanceof HTMLTextAreaElement) {
      return 'textarea';
    } else if (input instanceof HTMLSelectElement) {
      return input.multiple ? 'select-multiple' : 'select-one';
    }
    
    return 'text';
  }

  /**
   * 미리보기 표시
   */
  private showPreview(): void {
    const selectedFields = this.getSelectedFields();
    
    if (selectedFields.length === 0) {
      alert('선택된 필드가 없습니다.');
      return;
    }

    const previewContent = selectedFields
      .map(field => `✅ ${field.label}: "${field.value}"`)
      .join('\n');

    const confirmed = confirm(
      `저장할 필드 데이터:\n\n${previewContent}\n\n이 데이터를 저장하시겠습니까?`
    );

    if (confirmed) {
      this.handleSave();
    }
  }

  /**
   * 저장 처리 (제목은 URL로 자동 생성)
   */
  private handleSave(): void {
    const selectedFields = this.getSelectedFields();

    if (selectedFields.length === 0) {
      alert('선택된 필드가 없습니다.');
      return;
    }

    console.log('[SelectorMode] 필드 저장 요청:', selectedFields);

    if (this.callbacks.onSelectionComplete) {
      this.callbacks.onSelectionComplete(selectedFields);
    }

    this.deactivate('save');
  }

  /**
   * 활성화 피드백 표시
   */
  private showActivationFeedback(): void {
    // 간단한 토스트 메시지
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 16px;
      z-index: 1000000;
      animation: fadeInOut 2s ease;
    `;
    
    toast.textContent = '📝 필드 기억 모드가 활성화되었습니다';
    
    // CSS 애니메이션 추가
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
      style.remove();
    }, 2000);
  }

  /**
   * 오버레이 제거
   */
  private removeOverlay(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  /**
   * 컨트롤 패널 제거
   */
  private removeControlPanel(): void {
    if (this.controlPanel) {
      this.controlPanel.remove();
      this.controlPanel = null;
    }
  }
}
