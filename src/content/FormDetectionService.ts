import { detectForms, collectFieldValues, generateStorageKey, storageKeyToString } from '../utils/formDetection';
import type { FormInfo } from '../types/form';

export interface FormDetectionCallbacks {
  onFormsDetected?: (forms: FormInfo[]) => void;
  onFormSubmit?: (form: FormInfo) => void;
  onPageUnloadSave?: (form: FormInfo, values: Record<string, string>) => void;
}

export class FormDetectionService {
  private detectedForms: FormInfo[] = [];
  private readonly callbacks: FormDetectionCallbacks;

  constructor(callbacks: FormDetectionCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public initialize(): FormInfo[] {
    this.detectedForms = detectForms();

    console.log(`[FormDetectionService] ${this.detectedForms.length}개 폼 감지됨:`);
    this.detectedForms.forEach((form, index) => {
      const key = generateStorageKey(form);
      console.log(`  폼 ${index + 1}:`, {
        formElement: form.formElement ? 'form 태그' : '페이지 전체',
        fieldCount: form.fields.length,
        signature: form.signature,
        storageKey: storageKeyToString(key),
        fields: form.fields.map(field => ({ name: field.name, type: field.type }))
      });
    });

    this.detectedForms.forEach(form => this.setupFormListeners(form));
    this.setupPageUnloadListener();

    this.callbacks.onFormsDetected?.(this.detectedForms);
    return this.detectedForms;
  }

  public getForms(): FormInfo[] {
    return this.detectedForms;
  }

  private setupFormListeners(form: FormInfo): void {
    if (!form.formElement) {
      return;
    }

    form.formElement.addEventListener('submit', () => {
      this.callbacks.onFormSubmit?.(form);
    });
  }

  private setupPageUnloadListener(): void {
    window.addEventListener('beforeunload', () => {
      this.detectedForms.forEach(form => {
        if (form.formElement) {
          return;
        }

        const values = collectFieldValues(form.fields);
        if (Object.keys(values).length === 0) {
          return;
        }

        this.callbacks.onPageUnloadSave?.(form, values);
      });
    });
  }
}
