import type { FieldData } from '../types';

export interface MatchedField {
  field: FieldData;
  element: HTMLElement;
}

export class FieldMatcher {
  isExactMatch(field: FieldData): boolean {
    const element = document.querySelector(field.selector);

    if (!element) return false;
    if (!this.isInputElement(element as HTMLElement)) return false;

    const currentType = this.getElementType(element as HTMLElement);
    return currentType === field.type;
  }

  findMatchedFields(fields: FieldData[]): MatchedField[] {
    const matched: MatchedField[] = [];

    for (const field of fields) {
      const element = document.querySelector(field.selector) as HTMLElement;

      if (element && this.isExactMatch(field)) {
        matched.push({ field, element });
      }
    }

    return matched;
  }

  hasAnyMatch(fields: FieldData[]): boolean {
    return fields.some((field) => this.isExactMatch(field));
  }

  countMatches(fields: FieldData[]): number {
    return fields.filter((field) => this.isExactMatch(field)).length;
  }

  private isInputElement(element: HTMLElement): boolean {
    return (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    );
  }

  private getElementType(element: HTMLElement): string {
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
}

export const fieldMatcher = new FieldMatcher();
