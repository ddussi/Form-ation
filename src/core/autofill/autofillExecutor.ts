import type { AutofillMatch } from './fieldMatcher';

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
