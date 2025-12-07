export interface AliasModalResult {
  confirmed: boolean;
  alias: string;
}

export class AliasModal {
  private modal: HTMLDivElement | null = null;
  private resolve: ((result: AliasModalResult) => void) | null = null;

  show(defaultAlias: string): Promise<AliasModalResult> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.render(defaultAlias);
    });
  }

  private render(defaultAlias: string): void {
    this.ensureStyles();

    this.modal = document.createElement('div');
    this.modal.id = 'formation-alias-modal';
    this.modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483647;
      animation: formation-fade-in 0.2s ease;
    `;

    this.modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 12px;
        padding: 24px;
        width: 360px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: formation-scale-in 0.2s ease;
      ">
        <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #333;">
          저장 이름 설정
        </h3>
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #666;">
          이 데이터를 구분할 이름을 입력하세요.
        </p>

        <input
          type="text"
          id="formation-alias-input"
          value="${defaultAlias}"
          placeholder="예: SET 1"
          style="
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            box-sizing: border-box;
            outline: none;
            transition: border-color 0.2s;
          "
        />

        <div style="display: flex; gap: 12px; margin-top: 20px;">
          <button id="formation-alias-cancel" style="
            flex: 1;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: white;
            font-size: 14px;
            cursor: pointer;
            transition: background 0.2s;
          ">
            취소
          </button>
          <button id="formation-alias-confirm" style="
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 8px;
            background: #007bff;
            color: white;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
          ">
            저장
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);
    this.attachEvents();

    const input = this.modal.querySelector('#formation-alias-input') as HTMLInputElement;
    input?.focus();
    input?.select();
  }

  private attachEvents(): void {
    if (!this.modal) return;

    const input = this.modal.querySelector('#formation-alias-input') as HTMLInputElement;
    const confirmBtn = this.modal.querySelector('#formation-alias-confirm');
    const cancelBtn = this.modal.querySelector('#formation-alias-cancel');

    confirmBtn?.addEventListener('click', () => {
      this.close({ confirmed: true, alias: input.value.trim() || input.placeholder });
    });

    cancelBtn?.addEventListener('click', () => {
      this.close({ confirmed: false, alias: '' });
    });

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.close({ confirmed: true, alias: input.value.trim() || input.placeholder });
      } else if (e.key === 'Escape') {
        this.close({ confirmed: false, alias: '' });
      }
    });

    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close({ confirmed: false, alias: '' });
      }
    });

    input?.addEventListener('focus', () => {
      input.style.borderColor = '#007bff';
    });
    input?.addEventListener('blur', () => {
      input.style.borderColor = '#e0e0e0';
    });
  }

  private close(result: AliasModalResult): void {
    if (this.modal) {
      this.modal.style.animation = 'formation-fade-out 0.2s ease';
      setTimeout(() => {
        this.modal?.remove();
        this.modal = null;
      }, 200);
    }

    this.resolve?.(result);
    this.resolve = null;
  }

  private ensureStyles(): void {
    if (document.getElementById('formation-alias-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'formation-alias-modal-styles';
    style.textContent = `
      @keyframes formation-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes formation-fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      @keyframes formation-scale-in {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
}

export const aliasModal = new AliasModal();
