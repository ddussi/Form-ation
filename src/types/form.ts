// 폼 관련 타입 정의

export interface FormField {
  element: HTMLInputElement | HTMLTextAreaElement;
  name: string; // name 또는 id
  type: string;
  value: string;
}

export interface FormInfo {
  formElement: HTMLFormElement | null; // null이면 페이지 전체
  fields: FormField[];
  signature: string; // 폼 식별을 위한 서명
  url: string; // 현재 페이지 URL
}

export interface StorageKey {
  origin: string;
  path: string;
  formSignature: string;
}

export interface StoredFormData {
  fields: Record<string, string>; // fieldName: value
  timestamp: number;
  url: string;
}

// 지원하는 input 타입들
export const SUPPORTED_INPUT_TYPES = [
  'text',
  'email', 
  'tel',
  'url',
  'search',
  'number'
] as const;

export type SupportedInputType = typeof SUPPORTED_INPUT_TYPES[number];
