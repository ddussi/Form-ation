// 민감값 필터링 유틸리티

/**
 * 제외해야 하는 input 타입들
 */
export const FORBIDDEN_INPUT_TYPES = [
  'password',
  'hidden', // 숨겨진 필드도 제외
] as const;

/**
 * 금지 키워드들 (name, id, label에서 검사)
 */
export const FORBIDDEN_KEYWORDS = [
  // 비밀번호 관련
  'password', 'passwd', 'pwd', 'pass',
  '비밀번호', '암호',
  
  // OTP/인증 관련  
  'otp', 'totp', 'mfa', '2fa', 'auth', 'verification', 'verify',
  '인증', '확인', 'code', '코드',
  
  // 카드/금융 관련
  'card', 'credit', 'debit', 'cvv', 'cvc', 'security',
  '카드', '신용', '체크', '보안',
  
  // 주민번호/개인정보
  'ssn', 'social', 'resident', 'registration',
  '주민', '등록', '번호',
  
  // 기타 민감정보
  'pin', 'secret', 'private', 'confidential',
  '비밀', '기밀', '개인'
] as const;

/**
 * 필드가 민감값 필드인지 검사합니다
 */
export function isSensitiveField(element: HTMLInputElement | HTMLTextAreaElement): boolean {
  // 1. input type 검사
  if ('type' in element && FORBIDDEN_INPUT_TYPES.includes(element.type as any)) {
    return true;
  }
  
  // 2. name 속성 검사
  if (element.name && containsForbiddenKeyword(element.name)) {
    return true;
  }
  
  // 3. id 속성 검사  
  if (element.id && containsForbiddenKeyword(element.id)) {
    return true;
  }
  
  // 4. label 텍스트 검사
  const labelText = getLabelText(element);
  if (labelText && containsForbiddenKeyword(labelText)) {
    return true;
  }
  
  // 5. placeholder 텍스트 검사
  if (element.placeholder && containsForbiddenKeyword(element.placeholder)) {
    return true;
  }
  
  return false;
}

/**
 * 문자열에 금지 키워드가 포함되어 있는지 검사합니다
 */
function containsForbiddenKeyword(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  return FORBIDDEN_KEYWORDS.some(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
}

/**
 * 요소와 연결된 label의 텍스트를 가져옵니다
 */
function getLabelText(element: HTMLInputElement | HTMLTextAreaElement): string {
  // 1. for 속성으로 연결된 label 찾기
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) {
      return label.textContent || '';
    }
  }
  
  // 2. 부모 label 찾기
  const parentLabel = element.closest('label');
  if (parentLabel) {
    return parentLabel.textContent || '';
  }
  
  // 3. 인접한 label 찾기 (이전 형제)
  const prevElement = element.previousElementSibling;
  if (prevElement && prevElement.tagName === 'LABEL') {
    return prevElement.textContent || '';
  }
  
  return '';
}

/**
 * 필드 배열에서 민감값 필드들을 제거합니다
 */
export function filterSensitiveFields<T extends { element: HTMLInputElement | HTMLTextAreaElement }>(
  fields: T[]
): T[] {
  return fields.filter(field => {
    const isSensitive = isSensitiveField(field.element);
    
    if (isSensitive) {
      console.log('[필터링] 민감값 필드 제외:', {
        name: field.element.name || field.element.id,
        type: field.element.type,
        reason: getSensitiveReason(field.element)
      });
    }
    
    return !isSensitive;
  });
}

/**
 * 민감값으로 판단된 이유를 반환합니다 (디버깅용)
 */
function getSensitiveReason(element: HTMLInputElement | HTMLTextAreaElement): string {
  if ('type' in element && FORBIDDEN_INPUT_TYPES.includes(element.type as any)) {
    return `금지된 타입: ${element.type}`;
  }
  
  if (element.name && containsForbiddenKeyword(element.name)) {
    return `name에 금지 키워드: ${element.name}`;
  }
  
  if (element.id && containsForbiddenKeyword(element.id)) {
    return `id에 금지 키워드: ${element.id}`;
  }
  
  const labelText = getLabelText(element);
  if (labelText && containsForbiddenKeyword(labelText)) {
    return `label에 금지 키워드: ${labelText}`;
  }
  
  if (element.placeholder && containsForbiddenKeyword(element.placeholder)) {
    return `placeholder에 금지 키워드: ${element.placeholder}`;
  }
  
  return '알 수 없음';
}
