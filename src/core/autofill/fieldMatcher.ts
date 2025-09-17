import type { FormField, FormInfo, StoredFormData } from '../../shared/types';

/**
 * 자동입력을 위한 필드 매칭 결과
 */
export interface AutofillMatch {
  field: FormField;
  storedValue: string;
  canAutofill: boolean; // 기존 값이 없어서 입력 가능한지
}

/**
 * 저장된 데이터와 현재 폼 필드를 매칭합니다
 */
export function matchFieldsForAutofill(
  form: FormInfo,
  storedData: StoredFormData
): AutofillMatch[] {
  const matches: AutofillMatch[] = [];

  form.fields.forEach(field => {
    const storedValue = storedData.fields[field.name];
    
    if (storedValue !== undefined) {
      // 현재 필드에 이미 값이 있는지 확인
      const currentValue = field.element.value.trim();
      const canAutofill = currentValue === '';
      
      matches.push({
        field,
        storedValue,
        canAutofill
      });
    }
  });

  return matches;
}

/**
 * 자동입력 가능한 필드 개수를 반환합니다
 */
export function getAutofillableCount(matches: AutofillMatch[]): number {
  return matches.filter(match => match.canAutofill).length;
}

/**
 * 미리보기용 데이터를 생성합니다 (빈 필드만)
 */
export function generatePreviewData(matches: AutofillMatch[]): Record<string, string> {
  const preview: Record<string, string> = {};
  
  matches
    .filter(match => match.canAutofill)
    .forEach(match => {
      preview[match.field.name] = match.storedValue;
    });
  
  return preview;
}
