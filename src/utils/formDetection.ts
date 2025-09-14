import type { FormField, FormInfo, StorageKey } from '../types/form';
import { SUPPORTED_INPUT_TYPES } from '../types/form';
import { filterSensitiveFields } from './fieldFiltering';

/**
 * 페이지에서 모든 대상 필드를 수집합니다
 */
export function collectTargetFields(): FormField[] {
  const fields: FormField[] = [];
  
  // input 필드 수집
  const inputs = document.querySelectorAll('input');
  inputs.forEach(input => {
    if (SUPPORTED_INPUT_TYPES.includes(input.type as any)) {
      const name = input.name || input.id || '';
      if (name) { // name 또는 id가 있는 것만
        fields.push({
          element: input,
          name,
          type: input.type,
          value: input.value
        });
      }
    }
  });
  
  // textarea 수집
  const textareas = document.querySelectorAll('textarea');
  textareas.forEach(textarea => {
    const name = textarea.name || textarea.id || '';
    if (name) {
      fields.push({
        element: textarea,
        name,
        type: 'textarea',
        value: textarea.value
      });
    }
  });
  
  // 민감값 필드 필터링 적용
  return filterSensitiveFields(fields);
}

/**
 * 폼을 감지하고 정보를 수집합니다
 */
export function detectForms(): FormInfo[] {
  const forms: FormInfo[] = [];
  const allFields = collectTargetFields();
  
  // 1. form 태그가 있는 경우 - 폼 단위로 처리
  const formElements = document.querySelectorAll('form');
  const processedFields = new Set<HTMLElement>();
  
  formElements.forEach(formElement => {
    const formFields: FormField[] = [];
    
    allFields.forEach(field => {
      if (formElement.contains(field.element)) {
        formFields.push(field);
        processedFields.add(field.element);
      }
    });
    
    if (formFields.length > 0) {
      forms.push({
        formElement,
        fields: formFields,
        signature: generateFormSignature(formFields),
        url: window.location.href
      });
    }
  });
  
  // 2. form 태그에 속하지 않는 필드들 - 페이지 단위로 처리 (폴백)
  const orphanFields = allFields.filter(field => !processedFields.has(field.element));
  
  if (orphanFields.length > 0) {
    forms.push({
      formElement: null, // 페이지 전체
      fields: orphanFields,
      signature: generateFormSignature(orphanFields),
      url: window.location.href
    });
  }
  
  return forms;
}

/**
 * 필드 목록으로부터 폼 서명을 생성합니다
 */
export function generateFormSignature(fields: FormField[]): string {
  if (fields.length === 0) return 'empty';
  
  // name/id를 정렬해서 일관된 서명 생성
  const names = fields
    .map(field => field.name)
    .sort()
    .join('|');
  
  return `fields_${names}`;
}

/**
 * URL로부터 저장 키를 생성합니다
 */
export function generateStorageKey(formInfo: FormInfo): StorageKey {
  const url = new URL(formInfo.url);
  
  return {
    origin: url.origin,
    path: url.pathname,
    formSignature: formInfo.signature
  };
}

/**
 * 저장 키를 문자열로 변환합니다
 */
export function storageKeyToString(key: StorageKey): string {
  return `form_${key.origin}${key.path}_${key.formSignature}`;
}

/**
 * 현재 필드들의 값을 수집합니다
 */
export function collectFieldValues(fields: FormField[]): Record<string, string> {
  const values: Record<string, string> = {};
  
  fields.forEach(field => {
    // 현재 값을 다시 읽어옴 (사용자가 입력했을 수 있음)
    const currentValue = field.element.value;
    if (currentValue.trim() !== '') {
      values[field.name] = currentValue;
    }
  });
  
  return values;
}
