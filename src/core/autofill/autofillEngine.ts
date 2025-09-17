import type { FormInfo, StoredFormData } from '../../shared/types';
import { matchFieldsForAutofill, getAutofillableCount, generatePreviewData } from './fieldMatcher';
import { performAutofill, type AutofillResult } from './autofillExecutor';

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

// Re-export for convenience
export { matchFieldsForAutofill, generatePreviewData, getAutofillableCount };
