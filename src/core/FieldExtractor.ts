import type { FieldData } from '../types';

const EXCLUDED_TYPES = ['password', 'hidden', 'submit', 'button', 'reset', 'file', 'image'];
const STABLE_ATTRIBUTES = ['name', 'data-testid', 'data-test-id', 'data-cy'];

export class FieldExtractor {
  isSelectableField(element: HTMLElement): boolean {
    if (!element.isConnected) return false;
    if (element.hidden || element.style.display === 'none') return false;

    const rect = element.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return false;

    if (element instanceof HTMLInputElement) {
      if (EXCLUDED_TYPES.includes(element.type)) return false;
      if (element.disabled || element.readOnly) return false;
    }

    if (element instanceof HTMLTextAreaElement) {
      if (element.disabled || element.readOnly) return false;
    }

    if (element instanceof HTMLSelectElement) {
      if (element.disabled) return false;
    }

    return (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    );
  }

  findSelectableFields(): HTMLElement[] {
    const elements = document.querySelectorAll('input, textarea, select');
    return Array.from(elements).filter((el) =>
      this.isSelectableField(el as HTMLElement)
    ) as HTMLElement[];
  }

  extractFieldData(element: HTMLElement): FieldData {
    const { selector, isStable } = this.generateSelector(element);
    const type = this.getFieldType(element);
    const value = this.getFieldValue(element);
    const label = this.extractLabel(element);

    return { selector, type, value, label, isStable };
  }

  private generateSelector(element: HTMLElement): { selector: string; isStable: boolean } {
    const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

    if (input.name) {
      return {
        selector: `${element.tagName.toLowerCase()}[name="${input.name}"]`,
        isStable: true,
      };
    }

    for (const attr of STABLE_ATTRIBUTES) {
      const value = element.getAttribute(attr);
      if (value) {
        return {
          selector: `[${attr}="${value}"]`,
          isStable: true,
        };
      }
    }

    if (element.id) {
      return {
        selector: `#${element.id}`,
        isStable: false,
      };
    }

    if (element.className && input instanceof HTMLInputElement) {
      const firstClass = element.className.split(' ')[0];
      if (firstClass) {
        return {
          selector: `input.${firstClass}[type="${input.type}"]`,
          isStable: false,
        };
      }
    }

    return {
      selector: this.generatePositionalSelector(element),
      isStable: false,
    };
  }

  private generatePositionalSelector(element: HTMLElement): string {
    const tagName = element.tagName.toLowerCase();
    const parent = element.parentElement;

    if (!parent) return tagName;

    const siblings = Array.from(parent.children).filter(
      (child) => child.tagName.toLowerCase() === tagName
    );

    const index = siblings.indexOf(element);
    return index >= 0 ? `${tagName}:nth-of-type(${index + 1})` : tagName;
  }

  private getFieldType(element: HTMLElement): string {
    if (element instanceof HTMLInputElement) {
      return element.type;
    }
    if (element instanceof HTMLTextAreaElement) {
      return 'textarea';
    }
    if (element instanceof HTMLSelectElement) {
      return element.multiple ? 'select-multiple' : 'select-one';
    }
    return 'text';
  }

  private getFieldValue(element: HTMLElement): string {
    const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    return input.value || '';
  }

  private extractLabel(element: HTMLElement): string {
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label?.textContent) {
        return label.textContent.trim();
      }
    }

    const parentLabel = element.closest('label');
    if (parentLabel?.textContent) {
      const text = parentLabel.textContent.replace(
        (element as HTMLInputElement).value || '',
        ''
      );
      return text.trim();
    }

    if (element instanceof HTMLInputElement && element.placeholder) {
      return element.placeholder;
    }

    if (element instanceof HTMLInputElement && element.name) {
      return element.name;
    }

    return `${element.tagName.toLowerCase()}[${this.getFieldType(element)}]`;
  }
}

export const fieldExtractor = new FieldExtractor();
