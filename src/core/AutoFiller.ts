import type { FieldData, AutoFillResult } from '../types';
import { fieldMatcher } from './FieldMatcher';

export class AutoFiller {
  execute(fields: FieldData[]): AutoFillResult {
    const matchedFields = fieldMatcher.findMatchedFields(fields);
    const skippedSelectors: string[] = [];

    for (const field of fields) {
      if (!matchedFields.some((m) => m.field.selector === field.selector)) {
        skippedSelectors.push(field.selector);
      }
    }

    for (const { field, element } of matchedFields) {
      this.fillField(element, field.value);
    }

    return {
      totalCount: fields.length,
      filledCount: matchedFields.length,
      skippedCount: skippedSelectors.length,
      skippedSelectors,
    };
  }

  private fillField(element: HTMLElement, value: string): void {
    const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

    element.focus();

    if (input instanceof HTMLSelectElement) {
      this.fillSelectElement(input, value);
    } else {
      input.value = value;
    }

    this.triggerEvents(element);
    this.highlightField(element);
  }

  private fillSelectElement(select: HTMLSelectElement, value: string): void {
    for (const option of Array.from(select.options)) {
      if (option.value === value || option.textContent?.trim() === value) {
        select.value = option.value;
        return;
      }
    }
  }

  private triggerEvents(element: HTMLElement): void {
    ['input', 'change', 'blur'].forEach((eventType) => {
      element.dispatchEvent(new Event(eventType, { bubbles: true }));
    });
  }

  private highlightField(element: HTMLElement): void {
    const original = element.style.outline;
    element.style.outline = '2px solid #28a745';
    element.style.outlineOffset = '1px';

    setTimeout(() => {
      element.style.outline = original;
      element.style.outlineOffset = '';
    }, 2000);
  }
}

export const autoFiller = new AutoFiller();
