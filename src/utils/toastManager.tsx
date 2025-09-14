import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { Toast } from '../components/Toast';
import type { ToastType } from '../components/Toast';

export class ToastManager {
  private root: Root | null = null;
  private container: HTMLDivElement | null = null;
  private currentToast: { timeout: number | null } | null = null;

  constructor() {
    this.createContainer();
  }

  private createContainer() {
    // Shadow DOM을 사용해서 스타일 격리
    this.container = document.createElement('div');
    this.container.id = 'formation-toast-container';
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000000;
      pointer-events: none;
    `;
    
    // Shadow DOM 생성
    const shadowRoot = this.container.attachShadow({ mode: 'closed' });
    
    // React 루트 컨테이너
    const reactContainer = document.createElement('div');
    shadowRoot.appendChild(reactContainer);
    
    // CSS를 Shadow DOM에 주입
    const styleElement = document.createElement('style');
    styleElement.textContent = this.getToastStyles();
    shadowRoot.appendChild(styleElement);
    
    this.root = createRoot(reactContainer);
    document.body.appendChild(this.container);
  }

  private getToastStyles(): string {
    return `
/* Formation 토스트 스타일 */

.formation-toast {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 12px 16px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 300px;
  max-width: 400px;
  pointer-events: all;
  animation: formation-toast-slide-in 0.3s ease-out;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  border-left: 4px solid #007cba;
}

@keyframes formation-toast-slide-in {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.formation-toast-success {
  border-left-color: #28a745;
  background: #f8fff9;
}

.formation-toast-info {
  border-left-color: #007cba;
  background: #f8fcff;
}

.formation-toast-warning {
  border-left-color: #ffc107;
  background: #fffdf8;
}

.formation-toast-error {
  border-left-color: #dc3545;
  background: #fff8f8;
}

.formation-toast-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.formation-toast-icon {
  font-size: 16px;
  line-height: 1;
}

.formation-toast-message {
  color: #333;
  font-weight: 500;
}

.formation-toast-close {
  background: none;
  border: none;
  font-size: 18px;
  color: #666;
  cursor: pointer;
  padding: 0;
  margin-left: 12px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.formation-toast-close:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

@media (max-width: 480px) {
  .formation-toast {
    min-width: 280px;
    max-width: calc(100vw - 40px);
  }
}
    `;
  }

  show(message: string, type: ToastType = 'info', duration: number = 3000) {
    // 기존 토스트가 있으면 숨기기
    this.hide();

    if (this.container) {
      this.container.style.pointerEvents = 'all';
    }

    this.root?.render(
      <Toast
        message={message}
        type={type}
        isVisible={true}
        onHide={() => this.hide()}
      />
    );

    // 자동 숨김 타이머 설정
    this.currentToast = {
      timeout: window.setTimeout(() => {
        this.hide();
      }, duration)
    };
  }

  hide() {
    if (this.currentToast?.timeout) {
      window.clearTimeout(this.currentToast.timeout);
      this.currentToast = null;
    }

    if (this.container) {
      this.container.style.pointerEvents = 'none';
    }
    
    this.root?.render(<div />);
  }

  // 편의 메소드들
  success(message: string, duration?: number) {
    this.show(message, 'success', duration);
  }

  info(message: string, duration?: number) {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration?: number) {
    this.show(message, 'warning', duration);
  }

  error(message: string, duration?: number) {
    this.show(message, 'error', duration);
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

// 싱글톤 인스턴스
export const toastManager = new ToastManager();
