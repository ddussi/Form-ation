/**
 * 자동 입력 모달 UI 클래스
 * 모달 표시/숨김과 사용자 인터랙션 처리
 */

import type { FieldMemory } from '../types/fieldMemory';

export interface AutoFillModalCallbacks {
  onApply: (memory: FieldMemory) => void;
  onLater: () => void;
}

export class AutoFillModal {
  private currentModal: HTMLDivElement | null = null;
  private callbacks: AutoFillModalCallbacks;

  constructor(callbacks: AutoFillModalCallbacks) {
    this.callbacks = callbacks;
    this.addModalStyles();
  }

  /**
   * 모달 표시
   */
  show(memory: FieldMemory): void {
    if (this.currentModal) {
      this.hide();
    }

    this.currentModal = document.createElement('div');
    this.currentModal.className = 'form-ation-autofill-modal';
    this.currentModal.style.cssText = `
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

    this.currentModal.innerHTML = this.getModalContent(memory);
    document.body.appendChild(this.currentModal);

    // 버튼 이벤트 등록
    this.attachEvents(memory);

    // 자동 숨김 (30초 후)
    setTimeout(() => {
      this.hide();
    }, 30000);
  }

  /**
   * 모달 숨김
   */
  hide(): void {
    if (this.currentModal) {
      this.currentModal.style.animation = 'slideOutToLeft 0.3s ease';

      setTimeout(() => {
        if (this.currentModal) {
          this.currentModal.remove();
          this.currentModal = null;
        }
      }, 300);
    }
  }

  /**
   * 모달 내용 HTML 생성
   */
  private getModalContent(memory: FieldMemory): string {
    const fieldCount = memory.fields.length;
    const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString('ko-KR');

    return `
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
          📅 ${memory.title || '저장된 폼 데이터'}
        </div>
        <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
          ${formatDate(memory.timestamp)}에 저장됨
          ${memory.useCount > 0 ? ` · ${memory.useCount}회 사용` : ''}
        </div>
        <div style="font-size: 12px; color: #333;">
          📝 ${fieldCount}개 필드: ${memory.fields.slice(0, 3).map(f => f.label).join(', ')}${fieldCount > 3 ? '...' : ''}
        </div>
      </div>

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

      <div style="margin-top: 12px; font-size: 11px; color: #999; text-align: center;">
        이 알림은 30초 후 자동으로 사라집니다
      </div>
    `;
  }

  /**
   * 버튼 이벤트 등록
   */
  private attachEvents(memory: FieldMemory): void {
    if (!this.currentModal) return;

    const applyBtn = this.currentModal.querySelector('#form-ation-autofill-apply');
    const laterBtn = this.currentModal.querySelector('#form-ation-autofill-later');

    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        this.callbacks.onApply(memory);
        this.hide();
      });
    }

    if (laterBtn) {
      laterBtn.addEventListener('click', () => {
        this.callbacks.onLater();
        this.hide();
      });
    }
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
}
