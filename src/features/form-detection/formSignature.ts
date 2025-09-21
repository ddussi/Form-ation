import type { FormField, StorageKey } from '../../shared/types';

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
 * 저장 키를 문자열로 변환합니다
 */
export function storageKeyToString(key: StorageKey): string {
  return `form_${key.origin}${key.path}_${key.formSignature}`;
}
