import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { Toast } from '../components/Toast';
import type { ToastType } from '../components/Toast';
import { TOAST_STYLES } from './toastStyles';

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
    styleElement.textContent = TOAST_STYLES;
    shadowRoot.appendChild(styleElement);
    
    this.root = createRoot(reactContainer);
    document.body.appendChild(this.container);
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
