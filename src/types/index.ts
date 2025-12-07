/**
 * 도메인 모델 정의
 * 의존성 없는 순수 타입들
 */

/** 저장된 필드 데이터 */
export interface FieldData {
  selector: string;
  value: string;
  type: string;
  label: string;
  isStable: boolean;
}

/** 필드 메모리 (저장 단위) */
export interface FieldMemory {
  id: string;
  url: string;
  alias: string;
  fields: FieldData[];
  createdAt: number;
  lastUsedAt: number | null;
  useCount: number;
}

/** 필드 메모리 생성용 DTO */
export interface CreateFieldMemoryDto {
  url: string;
  alias: string;
  fields: FieldData[];
}

/** 필드 메모리 수정용 DTO */
export interface UpdateFieldMemoryDto {
  alias?: string;
}

/** 자동 입력 결과 */
export interface AutoFillResult {
  totalCount: number;
  filledCount: number;
  skippedCount: number;
  skippedSelectors: string[];
}

/** 메시지 타입 (Content ↔ Background ↔ Popup) */
export type MessageType =
  | { type: 'ACTIVATE_SELECTOR_MODE' }
  | { type: 'SELECTOR_MODE_ACTIVATED' }
  | { type: 'GET_MEMORIES_FOR_URL'; url: string }
  | { type: 'GET_MEMORIES_FOR_URL_RESULT'; memories: FieldMemory[] }
  | { type: 'SAVE_MEMORY'; data: CreateFieldMemoryDto }
  | { type: 'SAVE_MEMORY_RESULT'; id: string }
  | { type: 'EXECUTE_AUTOFILL'; memoryId: string }
  | { type: 'AUTOFILL_RESULT'; result: AutoFillResult }
  | { type: 'GET_ALL_MEMORIES' }
  | { type: 'GET_ALL_MEMORIES_RESULT'; memories: FieldMemory[] }
  | { type: 'DELETE_MEMORY'; id: string }
  | { type: 'UPDATE_MEMORY'; id: string; data: UpdateFieldMemoryDto }
  | { type: 'GET_NEXT_ALIAS'; url: string }
  | { type: 'GET_NEXT_ALIAS_RESULT'; alias: string };
