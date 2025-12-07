export class Overlay {
  private element: HTMLDivElement | null = null;

  show(): void {
    if (this.element) return;

    this.element = document.createElement('div');
    this.element.id = 'formation-overlay';
    this.element.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      z-index: 2147483640;
      pointer-events: none;
    `;

    document.body.appendChild(this.element);
  }

  hide(): void {
    this.element?.remove();
    this.element = null;
  }

  isVisible(): boolean {
    return this.element !== null && this.element.isConnected;
  }
}

export const overlay = new Overlay();
