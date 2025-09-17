// 간소화된 필드 필터링 (password 타입만 제외)

/**
 * 필드가 password 타입인지 검사합니다
 */
export function isSensitiveField(element: HTMLInputElement | HTMLTextAreaElement): boolean {
  // password 타입만 제외
  if ('type' in element && element.type === 'password') {
    return true;
  }
  
  return false;
}

/**
 * 필드 배열에서 password 타입 필드들을 제거합니다
 */
export function filterSensitiveFields<T extends { element: HTMLInputElement | HTMLTextAreaElement }>(
  fields: T[]
): T[] {
  return fields.filter(field => {
    const isSensitive = isSensitiveField(field.element);
    
    if (isSensitive) {
      console.log('[필터링] password 타입 필드 제외:', {
        name: field.element.name || field.element.id,
        type: field.element.type
      });
    }
    
    return !isSensitive;
  });
}
