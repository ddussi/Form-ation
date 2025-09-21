import type { FormField } from '../../shared/types';
import { SUPPORTED_INPUT_TYPES } from '../../shared/types';
import { filterSensitiveFields } from '../../shared/utils';

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
