import type { FormInfo, StorageKey } from '../../shared/types';
import { collectTargetFields } from './fieldCollector';
import { generateFormSignature } from './formSignature';

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
    const formFields = allFields.filter(field => {
      if (formElement.contains(field.element)) {
        processedFields.add(field.element);
        return true;
      }
      return false;
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
