/**
 * 간단한 폼 감지 - MVP용
 */

export interface SimpleFormField {
  element: HTMLInputElement | HTMLTextAreaElement;
  name: string;
  type: string;
  value: string;
}

export interface SimpleFormInfo {
  fields: SimpleFormField[];
  signature: string;
  url: string;
}

/**
 * 페이지에서 간단하게 입력 필드들을 수집
 */
export function collectFormFields(): SimpleFormField[] {
  const fields: SimpleFormField[] = [];
  
  // input 필드 수집
  const inputs = document.querySelectorAll('input');
  inputs.forEach(input => {
    // 기본적인 텍스트 입력 타입만
    if (['text', 'email', 'tel', 'url', 'search', 'number'].includes(input.type)) {
      const name = input.name || input.id || '';
      if (name) {
        fields.push({
          element: input,
          name,
          type: input.type,
          value: input.value || ''
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
        value: textarea.value || ''
      });
    }
  });
  
  // password 타입 제외
  return fields.filter(field => field.type !== 'password');
}

/**
 * 현재 페이지의 폼 정보 생성
 */
export function getSimpleFormInfo(): SimpleFormInfo {
  const fields = collectFormFields();
  const fieldNames = fields.map(f => f.name).sort().join(',');
  const signature = `form_${hashString(fieldNames)}`;
  
  return {
    fields,
    signature,
    url: window.location.href
  };
}

/**
 * 필드 값들을 수집
 */
export function collectFieldValues(fields: SimpleFormField[]): Record<string, string> {
  const values: Record<string, string> = {};
  
  fields.forEach(field => {
    const currentValue = field.element.value;
    if (currentValue.trim() !== '') {
      values[field.name] = currentValue;
    }
  });
  
  return values;
}

/**
 * 간단한 해시 함수
 */
function hashString(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit integer로 변환
  }
  
  return Math.abs(hash).toString(36);
}
