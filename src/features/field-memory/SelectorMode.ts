/**
 * 셀렉터 모드: 사용자가 저장할 필드들을 직접 선택하는 인터페이스
 */

import type {
  FieldData,
  FieldSelectionState,
  SelectorModeOptions,
} from '../../shared/types';
import {
  DEFAULT_SELECTOR_MODE_OPTIONS,
} from '../../shared/types';

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
    handleOutsideClick: this.handleOutsideClick.bind(this),
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

    this.createOverlay();
    this.createControlPanel();
    this.scanAndHighlightFields();
    this.attachEventListeners();
  }

  /**
   * 셀렉터 모드 비활성화
   */
  deactivate(reason: 'save' | 'cancel' | 'escape' = 'cancel'): void {
    if (!this.isActive) return;

    console.log('[SelectorMode] 셀렉터 모드 비활성화:', reason);
    this.isActive = false;

    this.detachEventListeners();
    this.removeOverlay();
    this.removeControlPanel();
    this.clearHighlights();
    
    this.callbacks.onModeExit?.(reason);
  }

  /**
   * 활성화 상태 확인
   */
  isActivated(): boolean {
    return this.isActive;
  }

  /**
   * 선택된 필드들 반환
   */
  getSelectedFields(): FieldData[] {
    return Array.from(this.selectedFields.values()).map(state => state.fieldData);
  }

  /**
   * 오버레이 생성
   */
  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.className = 'formation-selector-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.1);
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
    this.controlPanel.className = 'formation-selector-control';
    this.controlPanel.innerHTML = `
      <div class="formation-control-content">
        <div class="formation-control-header">
          <h3>📝 필드 선택 모드</h3>
          <span class="formation-selected-count">0개 선택됨</span>
        </div>
        <div class="formation-control-body">
          <p>저장할 필드들을 클릭해서 선택하세요</p>
        </div>
        <div class="formation-control-actions">
          <button class="formation-btn-primary formation-save-btn" disabled>저장</button>
          <button class="formation-btn-secondary formation-cancel-btn">취소</button>
        </div>
      </div>
    `;

    this.controlPanel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      min-width: 280px;
      max-width: 350px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      pointer-events: all;
    `;

    // 버튼 이벤트 연결
    const saveBtn = this.controlPanel.querySelector('.formation-save-btn') as HTMLButtonElement;
    const cancelBtn = this.controlPanel.querySelector('.formation-cancel-btn') as HTMLButtonElement;

    saveBtn.addEventListener('click', () => this.handleSave());
    cancelBtn.addEventListener('click', () => this.handleCancel());

    document.body.appendChild(this.controlPanel);
  }

  /**
   * 선택 가능한 필드들을 스캔하고 하이라이트
   */
  private scanAndHighlightFields(): void {
    // 지원하는 필드 타입들
    const supportedSelectors = [
      'input[type="text"]',
      'input[type="email"]',
      'input[type="tel"]',
      'input[type="url"]',
      'input[type="search"]',
      'input[type="number"]',
      'input[type="date"]',
      'input[type="datetime-local"]',
      'input[type="time"]',
      'input[type="month"]',
      'input[type="week"]',
      'textarea',
      'select'
    ];

    // 제외할 셀렉터들
    const excludeSelectors = this.options.excludeSelectors.join(', ');
    
    supportedSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        const htmlElement = element as HTMLElement;
        
        // 제외 대상 확인
        if (excludeSelectors && htmlElement.matches(excludeSelectors)) {
          return;
        }

        // 숨겨진 요소 제외
        if (this.isElementHidden(htmlElement)) {
          return;
        }

        this.selectableFields.add(htmlElement);
        this.addFieldHighlight(htmlElement);
      });
    });

    console.log('[SelectorMode] 선택 가능한 필드:', this.selectableFields.size);
  }

  /**
   * 요소가 숨겨져 있는지 확인
   */
  private isElementHidden(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.opacity === '0' ||
      element.offsetWidth === 0 ||
      element.offsetHeight === 0
    );
  }

  /**
   * 필드 하이라이트 추가
   */
  private addFieldHighlight(element: HTMLElement): void {
    element.style.outline = `2px solid ${this.options.highlightColor}`;
    element.style.outlineOffset = '2px';
    element.style.cursor = 'pointer';
    element.classList.add('formation-selectable-field');
  }

  /**
   * 필드 선택 표시
   */
  private markFieldAsSelected(element: HTMLElement): void {
    element.style.outline = `3px solid ${this.options.selectedColor}`;
    element.style.backgroundColor = `${this.options.selectedColor}20`;
    element.classList.add('formation-selected-field');
  }

  /**
   * 필드 선택 해제 표시
   */
  private markFieldAsDeselected(element: HTMLElement): void {
    element.style.outline = `2px solid ${this.options.highlightColor}`;
    element.style.backgroundColor = '';
    element.classList.remove('formation-selected-field');
  }

  /**
   * 이벤트 리스너 연결
   */
  private attachEventListeners(): void {
    document.addEventListener('click', this.boundHandlers.handleFieldClick, true);
    document.addEventListener('mouseover', this.boundHandlers.handleFieldHover);
    document.addEventListener('keydown', this.boundHandlers.handleKeyPress);
    document.addEventListener('click', this.boundHandlers.handleOutsideClick);
  }

  /**
   * 이벤트 리스너 해제
   */
  private detachEventListeners(): void {
    document.removeEventListener('click', this.boundHandlers.handleFieldClick, true);
    document.removeEventListener('mouseover', this.boundHandlers.handleFieldHover);
    document.removeEventListener('keydown', this.boundHandlers.handleKeyPress);
    document.removeEventListener('click', this.boundHandlers.handleOutsideClick);
  }

  /**
   * 필드 클릭 처리
   */
  private handleFieldClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    if (!this.selectableFields.has(target)) return;

    event.preventDefault();
    event.stopPropagation();

    this.toggleFieldSelection(target);
  }

  /**
   * 필드 호버 처리
   */
  private handleFieldHover(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    if (this.selectableFields.has(target) && !this.selectedFields.has(target)) {
      target.style.backgroundColor = `${this.options.highlightColor}10`;
    }
  }

  /**
   * 키보드 이벤트 처리
   */
  private handleKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.deactivate('escape');
    }
  }

  /**
   * 외부 클릭 처리
   */
  private handleOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // 컨트롤 패널 클릭은 무시
    if (this.controlPanel?.contains(target)) return;
    
    // 선택 가능한 필드가 아닌 곳 클릭 시 hover 효과 제거
    this.selectableFields.forEach(field => {
      if (!this.selectedFields.has(field)) {
        field.style.backgroundColor = '';
      }
    });
  }

  /**
   * 필드 선택/해제 토글
   */
  private toggleFieldSelection(element: HTMLElement): void {
    if (this.selectedFields.has(element)) {
      // 선택 해제
      const state = this.selectedFields.get(element)!;
      this.selectedFields.delete(element);
      this.markFieldAsDeselected(element);
      this.callbacks.onFieldDeselected?.(state);
    } else {
      // 선택 추가
      const fieldData = this.extractFieldData(element);
      const state: FieldSelectionState = {
        element,
        selector: this.generateSelector(element),
        fieldData,
        isSelected: true
      };
      
      this.selectedFields.set(element, state);
      this.markFieldAsSelected(element);
      this.callbacks.onFieldSelected?.(state);
    }

    this.updateControlPanel();
  }

  /**
   * 필드 데이터 추출
   */
  private extractFieldData(element: HTMLElement): FieldData {
    const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    
    const fieldData: FieldData = {
      selector: this.generateSelector(element),
      value: input.value || '',
      label: this.extractFieldLabel(element),
      type: this.getFieldType(input),
      placeholder: (input as HTMLInputElement).placeholder || undefined,
      isRequired: input.required || false,
      maxLength: (input as HTMLInputElement).maxLength > 0 ? (input as HTMLInputElement).maxLength : undefined
    };

    return fieldData;
  }

  /**
   * CSS 셀렉터 생성
   */
  private generateSelector(element: HTMLElement): string {
    // 1. ID가 있으면 사용
    if (element.id) {
      return `#${element.id}`;
    }

    // 2. name 속성이 있으면 사용
    const input = element as HTMLInputElement;
    if (input.name) {
      return `${element.tagName.toLowerCase()}[name="${input.name}"]`;
    }

    // 3. 위치 기반 셀렉터 생성
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(element) + 1;
      return `${this.generateSelector(parent)} > ${element.tagName.toLowerCase()}:nth-child(${index})`;
    }

    return element.tagName.toLowerCase();
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
    if ((input as HTMLInputElement).placeholder) {
      return (input as HTMLInputElement).placeholder;
    }

    // 5. name 속성 사용
    if (input.name) {
      return input.name;
    }

    return 'Unknown Field';
  }

  /**
   * 필드 타입 추출
   */
  private getFieldType(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
    if (element.tagName.toLowerCase() === 'textarea') {
      return 'textarea';
    }
    
    if (element.tagName.toLowerCase() === 'select') {
      return (element as HTMLSelectElement).multiple ? 'select-multiple' : 'select-one';
    }

    return (element as HTMLInputElement).type || 'text';
  }

  /**
   * 컨트롤 패널 업데이트
   */
  private updateControlPanel(): void {
    if (!this.controlPanel) return;

    const countElement = this.controlPanel.querySelector('.formation-selected-count');
    const saveBtn = this.controlPanel.querySelector('.formation-save-btn') as HTMLButtonElement;

    const selectedCount = this.selectedFields.size;
    
    if (countElement) {
      countElement.textContent = `${selectedCount}개 선택됨`;
    }

    saveBtn.disabled = selectedCount === 0;
  }

  /**
   * 저장 처리
   */
  private handleSave(): void {
    const selectedFields = this.getSelectedFields();
    
    if (selectedFields.length === 0) {
      alert('선택된 필드가 없습니다.');
      return;
    }

    this.callbacks.onSelectionComplete?.(selectedFields);
    this.deactivate('save');
  }

  /**
   * 취소 처리
   */
  private handleCancel(): void {
    this.deactivate('cancel');
  }

  /**
   * 오버레이 제거
   */
  private removeOverlay(): void {
    if (this.overlay) {
      document.body.removeChild(this.overlay);
      this.overlay = null;
    }
  }

  /**
   * 컨트롤 패널 제거
   */
  private removeControlPanel(): void {
    if (this.controlPanel) {
      document.body.removeChild(this.controlPanel);
      this.controlPanel = null;
    }
  }

  /**
   * 모든 하이라이트 제거
   */
  private clearHighlights(): void {
    this.selectableFields.forEach(element => {
      element.style.outline = '';
      element.style.outlineOffset = '';
      element.style.backgroundColor = '';
      element.style.cursor = '';
      element.classList.remove('formation-selectable-field', 'formation-selected-field');
    });

    this.selectableFields.clear();
    this.selectedFields.clear();
  }
}
