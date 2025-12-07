import type { FieldData } from '../types';
import { fieldExtractor } from '../core';
import { overlay, toast, aliasModal } from '../ui';

const HIGHLIGHT_COLOR = '#007bff';
const SELECTED_COLOR = '#28a745';
const WARNING_COLOR = '#ffc107';

export interface SelectorModeResult {
  saved: boolean;
  alias: string;
  fields: FieldData[];
}

export class SelectorMode {
  private isActive = false;
  private selectableFields = new Set<HTMLElement>();
  private selectedFields = new Map<HTMLElement, FieldData>();
  private controlPanel: HTMLDivElement | null = null;

  private boundHandlers = {
    onClick: this.handleClick.bind(this),
    onKeyDown: this.handleKeyDown.bind(this),
  };

  async activate(): Promise<SelectorModeResult> {
    if (this.isActive) {
      return { saved: false, alias: '', fields: [] };
    }

    this.isActive = true;

    // 선택 가능한 필드 찾기
    const fields = fieldExtractor.findSelectableFields();
    fields.forEach((el) => this.selectableFields.add(el));

    if (this.selectableFields.size === 0) {
      toast.warning('선택 가능한 입력 필드가 없습니다.');
      this.isActive = false;
      return { saved: false, alias: '', fields: [] };
    }

    // UI 표시
    overlay.show();
    this.createControlPanel();
    this.highlightFields();
    this.attachEvents();

    toast.info('저장할 필드를 클릭하세요');

    // 사용자 행동 대기
    return new Promise((resolve) => {
      this.onComplete = resolve;
    });
  }

  private onComplete: ((result: SelectorModeResult) => void) | null = null;

  private deactivate(result: SelectorModeResult): void {
    this.detachEvents();
    this.removeHighlights();
    this.removeControlPanel();
    overlay.hide();

    this.selectableFields.clear();
    this.selectedFields.clear();
    this.isActive = false;

    this.onComplete?.(result);
    this.onComplete = null;
  }

  isActivated(): boolean {
    return this.isActive;
  }

  private createControlPanel(): void {
    this.controlPanel = document.createElement('div');
    this.controlPanel.id = 'formation-control-panel';
    this.controlPanel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border: 2px solid ${HIGHLIGHT_COLOR};
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      z-index: 2147483646;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-width: 280px;
    `;

    this.updateControlPanel();
    document.body.appendChild(this.controlPanel);
  }

  private updateControlPanel(): void {
    if (!this.controlPanel) return;

    const selectedCount = this.selectedFields.size;
    const totalCount = this.selectableFields.size;

    this.controlPanel.innerHTML = `
      <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #333;">
        필드 선택 모드
      </h3>
      <p style="margin: 0 0 16px 0; font-size: 13px; color: #666;">
        저장할 필드를 클릭하세요
      </p>

      <div style="
        padding: 12px;
        background: #f8f9fa;
        border-radius: 8px;
        margin-bottom: 16px;
        font-size: 14px;
      ">
        <strong style="color: ${SELECTED_COLOR};">${selectedCount}</strong>
        <span style="color: #666;"> / ${totalCount} 필드 선택됨</span>
      </div>

      <div style="display: flex; gap: 8px;">
        <button id="formation-save-btn" style="
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 8px;
          background: ${selectedCount > 0 ? SELECTED_COLOR : '#ccc'};
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: ${selectedCount > 0 ? 'pointer' : 'not-allowed'};
        " ${selectedCount === 0 ? 'disabled' : ''}>
          저장
        </button>

        <button id="formation-cancel-btn" style="
          flex: 1;
          padding: 12px;
          border: 1px solid #dc3545;
          border-radius: 8px;
          background: white;
          color: #dc3545;
          font-size: 14px;
          cursor: pointer;
        ">
          취소
        </button>
      </div>

      <p style="margin: 12px 0 0 0; font-size: 11px; color: #999; text-align: center;">
        ESC 키로 취소 | 선택된 필드 다시 클릭하면 해제
      </p>
    `;

    // 버튼 이벤트
    const saveBtn = this.controlPanel.querySelector('#formation-save-btn');
    const cancelBtn = this.controlPanel.querySelector('#formation-cancel-btn');

    saveBtn?.addEventListener('click', () => this.handleSave());
    cancelBtn?.addEventListener('click', () => this.handleCancel());
  }

  private highlightFields(): void {
    this.selectableFields.forEach((el) => {
      el.style.outline = `2px dashed ${HIGHLIGHT_COLOR}`;
      el.style.outlineOffset = '2px';
      el.style.cursor = 'pointer';
    });
  }

  private removeHighlights(): void {
    this.selectableFields.forEach((el) => {
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.cursor = '';
    });

    this.selectedFields.forEach((_, el) => {
      this.removeCheckIcon(el);
    });
  }

  private removeControlPanel(): void {
    this.controlPanel?.remove();
    this.controlPanel = null;
  }

  private attachEvents(): void {
    document.addEventListener('click', this.boundHandlers.onClick, true);
    document.addEventListener('keydown', this.boundHandlers.onKeyDown, true);
  }

  private detachEvents(): void {
    document.removeEventListener('click', this.boundHandlers.onClick, true);
    document.removeEventListener('keydown', this.boundHandlers.onKeyDown, true);
  }

  private handleClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    if (this.controlPanel?.contains(target)) return;

    if (this.selectableFields.has(target)) {
      e.preventDefault();
      e.stopPropagation();

      if (this.selectedFields.has(target)) {
        this.deselectField(target);
      } else {
        this.selectField(target);
      }
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.handleCancel();
    }
  }

  private selectField(element: HTMLElement): void {
    const fieldData = fieldExtractor.extractFieldData(element);
    this.selectedFields.set(element, fieldData);

    element.style.outline = `3px solid ${SELECTED_COLOR}`;
    this.addCheckIcon(element, fieldData.isStable);
    this.updateControlPanel();
  }

  private deselectField(element: HTMLElement): void {
    this.selectedFields.delete(element);

    element.style.outline = `2px dashed ${HIGHLIGHT_COLOR}`;
    this.removeCheckIcon(element);
    this.updateControlPanel();
  }

  private addCheckIcon(element: HTMLElement, isStable: boolean): void {
    const iconContainer = document.createElement('div');
    iconContainer.className = 'formation-check-icon';
    iconContainer.style.cssText = `
      position: absolute;
      top: -10px;
      right: -10px;
      display: flex;
      gap: 2px;
      z-index: 2147483645;
      pointer-events: none;
    `;

    const checkIcon = document.createElement('div');
    checkIcon.style.cssText = `
      width: 22px;
      height: 22px;
      background: ${SELECTED_COLOR};
      border: 2px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: bold;
    `;
    checkIcon.textContent = '✓';
    iconContainer.appendChild(checkIcon);

    if (!isStable) {
      const warningIcon = document.createElement('div');
      warningIcon.style.cssText = `
        width: 22px;
        height: 22px;
        background: ${WARNING_COLOR};
        border: 2px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #333;
        font-size: 12px;
        font-weight: bold;
      `;
      warningIcon.textContent = '!';
      warningIcon.title = '이 필드는 불안정할 수 있습니다';
      iconContainer.appendChild(warningIcon);
    }

    const parent = element.parentElement;
    if (parent && getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    parent?.appendChild(iconContainer);
  }

  private removeCheckIcon(element: HTMLElement): void {
    element.parentElement?.querySelector('.formation-check-icon')?.remove();
  }

  private async handleSave(): Promise<void> {
    if (this.selectedFields.size === 0) return;

    const fields = Array.from(this.selectedFields.values());

    // 별칭 입력 모달 표시
    const nextAlias = await this.getNextAlias();
    const result = await aliasModal.show(nextAlias);

    if (!result.confirmed) {
      return; // 취소 시 셀렉터 모드 유지
    }

    this.deactivate({
      saved: true,
      alias: result.alias,
      fields,
    });
  }

  private handleCancel(): void {
    this.deactivate({
      saved: false,
      alias: '',
      fields: [],
    });
  }

  private async getNextAlias(): Promise<string> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'GET_NEXT_ALIAS', url: window.location.href },
        (response: { alias?: string } | undefined) => {
          resolve(response?.alias || 'SET 1');
        }
      );
    });
  }
}

export const selectorMode = new SelectorMode();
