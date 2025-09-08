import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { SaveConfirmModal } from '../components/SaveConfirmModal.js';
import { AutofillConfirmModal } from '../components/AutofillConfirmModal.js';
import type { FormInfo } from '../types/form.js';

export class ModalManager {
  private root: Root | null = null;
  private container: HTMLDivElement | null = null;
  private isVisible = false;

  constructor() {
    this.createContainer();
  }

  private createContainer() {
    // Shadow DOM을 사용해서 스타일 격리
    this.container = document.createElement('div');
    this.container.id = 'formation-modal-container';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999999;
    `;
    
    // Shadow DOM 생성
    const shadowRoot = this.container.attachShadow({ mode: 'closed' });
    
    // React 루트 컨테이너
    const reactContainer = document.createElement('div');
    shadowRoot.appendChild(reactContainer);
    
    // CSS를 Shadow DOM에 주입
    const styleElement = document.createElement('style');
    styleElement.textContent = this.getModalStyles();
    shadowRoot.appendChild(styleElement);
    
    this.root = createRoot(reactContainer);
    document.body.appendChild(this.container);
  }

  private getModalStyles(): string {
    // 모달 CSS를 인라인으로 포함
    return `
/* Form-ation 저장 확인 모달 스타일 */

.formation-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999999;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  pointer-events: all;
}

.formation-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  max-width: 400px;
  width: calc(100% - 40px);
  max-height: calc(100vh - 40px);
  overflow: hidden;
  animation: formation-modal-appear 0.3s ease-out;
}

@keyframes formation-modal-appear {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.formation-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 10px;
  border-bottom: 1px solid #e0e0e0;
}

.formation-modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.formation-close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.formation-close-btn:hover {
  background-color: #f0f0f0;
}

.formation-modal-body {
  padding: 20px;
}

.formation-question {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin: 0 0 15px 0;
}

.formation-form-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  margin: 15px 0;
  font-size: 14px;
  color: #666;
}

.formation-form-info div {
  margin: 4px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.formation-description {
  font-size: 14px;
  color: #666;
  margin: 15px 0 0 0;
  line-height: 1.4;
}

.formation-modal-actions {
  padding: 15px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.formation-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.formation-btn-primary {
  background: #007cba;
  color: white;
}

.formation-btn-primary:hover {
  background: #005a87;
}

.formation-btn-secondary {
  background: #f8f9fa;
  color: #333;
  border: 1px solid #ddd;
}

.formation-btn-secondary:hover {
  background: #e9ecef;
}

.formation-btn-tertiary {
  background: none;
  color: #666;
  border: 1px solid #ddd;
}

.formation-btn-tertiary:hover {
  background: #f8f9fa;
}

/* 자동입력 모달 전용 스타일 */
.formation-preview {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  margin: 15px 0;
  border-left: 4px solid #007cba;
}

.formation-preview h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.formation-preview-item {
  display: flex;
  margin: 6px 0;
  font-size: 13px;
}

.formation-field-name {
  font-weight: 500;
  color: #666;
  min-width: 80px;
  margin-right: 8px;
}

.formation-field-value {
  color: #333;
  font-family: 'SF Mono', Consolas, monospace;
  background: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.formation-preview-more {
  font-size: 12px;
  color: #666;
  margin-top: 8px;
  font-style: italic;
}

@media (max-width: 480px) {
  .formation-modal {
    margin: 20px;
    width: calc(100% - 40px);
  }
  
  .formation-modal-actions {
    padding: 15px;
  }
  
  .formation-btn {
    padding: 14px 20px;
    font-size: 16px;
  }
  
  .formation-preview-item {
    flex-direction: column;
    gap: 4px;
  }
  
  .formation-field-name {
    min-width: auto;
  }
}
    `;
  }

  showSaveConfirm(
    formInfo: FormInfo,
    onSave: () => void,
    onNoThisTime: () => void,
    onNeverAsk: () => void
  ) {
    if (this.isVisible) return;
    
    this.isVisible = true;
    
    if (this.container) {
      this.container.style.pointerEvents = 'all';
    }

    const handleClose = () => {
      this.hide();
    };

    this.root?.render(
      <SaveConfirmModal
        isVisible={true}
        onSave={() => {
          onSave();
          this.hide();
        }}
        onNoThisTime={() => {
          onNoThisTime();
          this.hide();
        }}
        onNeverAsk={() => {
          onNeverAsk();
          this.hide();
        }}
        onClose={handleClose}
        formInfo={{
          fieldCount: formInfo.fields.length,
          url: formInfo.url
        }}
      />
    );
  }

  showAutofillConfirm(
    formInfo: FormInfo,
    previewData: Record<string, string>,
    remainingFormsCount: number,
    onAutofill: () => void,
    onNoThisTime: () => void,
    onNeverAsk: () => void
  ) {
    if (this.isVisible) return;
    
    this.isVisible = true;
    
    if (this.container) {
      this.container.style.pointerEvents = 'all';
    }

    const handleClose = () => {
      this.hide();
    };

    this.root?.render(
      <AutofillConfirmModal
        isVisible={true}
        onAutofill={() => {
          onAutofill();
          this.hide();
        }}
        onNoThisTime={() => {
          onNoThisTime();
          this.hide();
        }}
        onNeverAsk={() => {
          onNeverAsk();
          this.hide();
        }}
        onClose={handleClose}
        formInfo={{
          fieldCount: Object.keys(previewData).length,
          url: formInfo.url,
          previewData,
          remainingFormsCount
        }}
      />
    );
  }

  hide() {
    this.isVisible = false;
    
    if (this.container) {
      this.container.style.pointerEvents = 'none';
    }
    
    this.root?.render(<div />);
  }

  destroy() {
    this.hide();
    if (this.container) {
      document.body.removeChild(this.container);
      this.container = null;
    }
    this.root = null;
  }
}
