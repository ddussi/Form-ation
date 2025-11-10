export type ToastType = 'success' | 'info' | 'warning' | 'error';

export class ToastManager {
  private container: HTMLDivElement | null = null;
  private currentToast: HTMLDivElement | null = null;
  private currentTimeout: number | null = null;

  constructor() {
    this.createContainer();
  }

  private createContainer() {
    this.container = document.createElement('div');
    this.container.id = 'formation-toast-container';
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000000;
      pointer-events: none;
    `;

    // 스타일 추가
    const style = document.createElement('style');
    style.textContent = this.getToastStyles();
    document.head.appendChild(style);

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
  gap: 8px;
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

@keyframes formation-toast-slide-out {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
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

.formation-toast-icon {
  font-size: 16px;
  line-height: 1;
}

.formation-toast-message {
  color: #333;
  font-weight: 500;
  flex: 1;
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

    const icons = {
      success: '✅',
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌'
    };

    this.currentToast = document.createElement('div');
    this.currentToast.className = `formation-toast formation-toast-${type}`;
    this.currentToast.innerHTML = `
      <span class="formation-toast-icon">${icons[type]}</span>
      <span class="formation-toast-message">${message}</span>
    `;

    this.container?.appendChild(this.currentToast);

    // 자동 숨김 타이머 설정
    this.currentTimeout = window.setTimeout(() => {
      this.hide();
    }, duration);
  }

  hide() {
    if (this.currentTimeout) {
      window.clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }

    if (this.currentToast) {
      this.currentToast.style.animation = 'formation-toast-slide-out 0.3s ease-out';
      setTimeout(() => {
        if (this.currentToast) {
          this.currentToast.remove();
          this.currentToast = null;
        }
      }, 300);
    }
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
  }
}

// 싱글톤 인스턴스
export const toastManager = new ToastManager();
