import type { FieldData } from '../types';
import { fieldMatcher } from '../core';

export type FieldDetectedCallback = () => void;

export class FieldObserver {
  private observer: MutationObserver | null = null;
  private fieldsToWatch: FieldData[] = [];
  private callback: FieldDetectedCallback | null = null;
  private hasNotified = false;
  private debounceTimer: number | null = null;

  start(fields: FieldData[], callback: FieldDetectedCallback): void {
    this.stop();

    this.fieldsToWatch = fields;
    this.callback = callback;
    this.hasNotified = false;

    if (this.checkFields()) {
      return;
    }

    this.observer = new MutationObserver(() => {
      this.debouncedCheck();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.observer?.disconnect();
    this.observer = null;
    this.fieldsToWatch = [];
    this.callback = null;
    this.hasNotified = false;
  }

  private debouncedCheck(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      this.checkFields();
    }, 100);
  }

  private checkFields(): boolean {
    if (this.hasNotified) return true;
    if (this.fieldsToWatch.length === 0) return false;

    const hasMatch = fieldMatcher.hasAnyMatch(this.fieldsToWatch);

    if (hasMatch) {
      this.hasNotified = true;
      this.callback?.();
      this.stop();
      return true;
    }

    return false;
  }

  isWatching(): boolean {
    return this.observer !== null;
  }
}

export const fieldObserver = new FieldObserver();
