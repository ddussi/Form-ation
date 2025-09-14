import type { FormField, FormInfo, StoredFormData } from '../types/form';

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
 * 실제로 필드에 값을 입력합니다
 */
export function performAutofill(matches: AutofillMatch[]): number {
  let filledCount = 0;

  matches.forEach(match => {
    if (match.canAutofill && match.storedValue) {
      try {
        // 값 설정
        match.field.element.value = match.storedValue;
        
        // input 이벤트 발생시켜서 React 등의 프레임워크에서 인식하도록 함
        const inputEvent = new Event('input', { bubbles: true });
        match.field.element.dispatchEvent(inputEvent);
        
        // change 이벤트도 발생
        const changeEvent = new Event('change', { bubbles: true });
        match.field.element.dispatchEvent(changeEvent);
        
        filledCount++;
        
        console.log(`[Autofill] 필드 입력됨: ${match.field.name} = ${match.storedValue}`);
      } catch (error) {
        console.error(`[Autofill] 필드 입력 실패: ${match.field.name}`, error);
      }
    } else if (!match.canAutofill) {
      console.log(`[Autofill] 기존 값 존재로 건너뜀: ${match.field.name}`);
    }
  });

  return filledCount;
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

/**
 * 자동입력 결과 정보
 */
export interface AutofillResult {
  totalMatches: number;
  autofillableCount: number;
  filledCount: number;
  skippedCount: number;
}

/**
 * 자동입력을 실행하고 결과를 반환합니다
 */
export function executeAutofill(
  form: FormInfo,
  storedData: StoredFormData
): AutofillResult {
  const matches = matchFieldsForAutofill(form, storedData);
  const autofillableCount = getAutofillableCount(matches);
  const filledCount = performAutofill(matches);
  const skippedCount = matches.length - filledCount;

  const result: AutofillResult = {
    totalMatches: matches.length,
    autofillableCount,
    filledCount,
    skippedCount
  };

  console.log('[Autofill] 실행 결과:', result);
  return result;
}
