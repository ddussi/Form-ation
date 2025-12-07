type ToastType = 'success' | 'info' | 'warning' | 'error';

const ICONS: Record<ToastType, string> = {
  success: '✓',
  info: 'ℹ',
  warning: '⚠',
  error: '✕',
};

const COLORS: Record<ToastType, string> = {
  success: '#28a745',
  info: '#007bff',
  warning: '#ffc107',
  error: '#dc3545',
};

export class Toast {
  private container: HTMLDivElement | null = null;
  private currentToast: HTMLDivElement | null = null;
  private timeoutId: number | null = null;

  constructor() {
    this.ensureContainer();
  }

  show(message: string, type: ToastType = 'info', duration = 3000): void {
    this.hide();
    this.ensureContainer();

    this.currentToast = document.createElement('div');
    this.currentToast.style.cssText = `
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 280px;
      max-width: 400px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      border-left: 4px solid ${COLORS[type]};
      animation: toast-slide-in 0.3s ease-out;
    `;

    this.currentToast.innerHTML = `
      <span style="color: ${COLORS[type]}; font-weight: bold; font-size: 16px;">${ICONS[type]}</span>
      <span style="color: #333; flex: 1;">${message}</span>
    `;

    this.container?.appendChild(this.currentToast);

    this.timeoutId = window.setTimeout(() => this.hide(), duration);
  }

  hide(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.currentToast) {
      this.currentToast.style.animation = 'toast-slide-out 0.3s ease-out';
      const toast = this.currentToast;
      setTimeout(() => toast.remove(), 300);
      this.currentToast = null;
    }
  }

  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }

  error(message: string, duration?: number): void {
    this.show(message, 'error', duration);
  }

  private ensureContainer(): void {
    if (this.container && this.container.isConnected) return;

    if (!document.getElementById('formation-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'formation-toast-styles';
      style.textContent = `
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes toast-slide-out {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(100%); }
        }
      `;
      document.head.appendChild(style);
    }

    this.container = document.createElement('div');
    this.container.id = 'formation-toast-container';
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483647;
    `;
    document.body.appendChild(this.container);
  }

  destroy(): void {
    this.hide();
    this.container?.remove();
    this.container = null;
  }
}

export const toast = new Toast();
