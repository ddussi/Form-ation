/**
 * 셀렉터 모드 기반 필드 기억 시스템을 위한 타입 정의
 */

/**
 * 저장된 필드 메모리 데이터
 */
export interface FieldMemory {
  id: string;                    // UUID
  url: string;                   // 전체 URL
  urlPattern: string;            // 매칭용 패턴 (쿼리 파라미터 제외)
  title: string;                 // 사용자가 지정한 제목
  timestamp: number;             // 저장 시각
  lastUsed?: number;             // 마지막 사용 시각
  useCount: number;              // 사용 횟수
  fields: FieldData[];           // 선택된 필드들
}

/**
 * 개별 필드 데이터
 */
export interface FieldData {
  selector: string;              // CSS 셀렉터
  value: string;                 // 저장된 값
  label: string;                 // 필드 라벨 (자동 추출)
  type: string;                  // input 타입 (text, email, tel 등)
  placeholder?: string;          // placeholder 텍스트
  isRequired: boolean;           // required 속성 여부
  maxLength?: number;            // maxlength 속성
}

/**
 * 셀렉터 모드 옵션
 */
export interface SelectorModeOptions {
  highlightColor: string;        // 선택 가능한 필드 하이라이트 색상
  selectedColor: string;         // 선택된 필드 하이라이트 색상
  excludeTypes: string[];        // 제외할 input 타입들
  excludeSelectors: string[];    // 제외할 CSS 셀렉터들
  autoDetectLabels: boolean;     // 라벨 자동 감지 여부
}

/**
 * 필드 선택 상태
 */
export interface FieldSelectionState {
  element: HTMLElement;
  selector: string;
  fieldData: FieldData;
  isSelected: boolean;
}

/**
 * URL 패턴 매칭 옵션
 */
export interface UrlMatchingOptions {
  ignoreSearchParams: boolean;   // 쿼리 파라미터 무시
  ignoreHash: boolean;           // 해시 무시
  exactPath: boolean;            // 정확한 경로 매칭
  wildcardDomains: string[];     // 와일드카드 도메인 패턴
}

/**
 * 자동 입력 결과
 */
export interface AutoFillResult {
  success: boolean;
  filledCount: number;
  failedCount: number;
  failedFields: string[];        // 실패한 셀렉터들
  message: string;
}

/**
 * 필드 기억 통계
 */
export interface FieldMemoryStats {
  totalCount: number;            // 전체 메모리 수
  totalSize: number;             // 전체 크기 (바이트)
  totalFields: number;
  mostUsedSites: Array<{
    domain: string;
    count: number;
  }>;
  recentlyUsed: FieldMemory[];
}

/**
 * 기본 설정값들
 */
export const DEFAULT_SELECTOR_MODE_OPTIONS: SelectorModeOptions = {
  highlightColor: '#007bff',     // 파란색
  selectedColor: '#28a745',      // 녹색
  excludeTypes: ['password', 'hidden', 'submit', 'button', 'reset'],
  excludeSelectors: [
    '[type="password"]',
    '[type="hidden"]', 
    '.captcha',
    '.recaptcha'
  ],
  autoDetectLabels: true,
};

export const DEFAULT_URL_MATCHING_OPTIONS: UrlMatchingOptions = {
  ignoreSearchParams: true,
  ignoreHash: true,
  exactPath: false,
  wildcardDomains: [],
};

/**
 * 필드 매칭 신뢰도
 */
export const MatchConfidence = {
  EXACT: 'exact',               // 완전 일치
  HIGH: 'high',                 // 높은 신뢰도
  MEDIUM: 'medium',             // 중간 신뢰도
  LOW: 'low',                   // 낮은 신뢰도
  FAILED: 'failed',             // 매칭 실패
} as const;

export type MatchConfidence = typeof MatchConfidence[keyof typeof MatchConfidence];
