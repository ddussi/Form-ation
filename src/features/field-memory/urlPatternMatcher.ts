import type { UrlMatchingOptions } from '../../shared/types';
import { DEFAULT_URL_MATCHING_OPTIONS } from '../../shared/types';

/**
 * URL에서 패턴 생성 (매칭용)
 */
export function generateUrlPattern(url: string, options?: UrlMatchingOptions): string {
  const opts = { ...DEFAULT_URL_MATCHING_OPTIONS, ...options };
  
  try {
    const urlObj = new URL(url);
    
    let pattern = `${urlObj.protocol}//${urlObj.hostname}`;
    
    if (!opts.exactPath) {
      // 경로의 동적 부분 제거 (숫자, UUID 등)
      let path = urlObj.pathname
        .replace(/\/\d+/g, '/*')           // 숫자 세그먼트
        .replace(/\/[a-f0-9-]{36}/g, '/*') // UUID 세그먼트
        .replace(/\/[a-f0-9]{32}/g, '/*'); // 해시 세그먼트
      
      pattern += path;
    } else {
      pattern += urlObj.pathname;
    }
    
    if (!opts.ignoreSearchParams && urlObj.search) {
      pattern += urlObj.search;
    }
    
    if (!opts.ignoreHash && urlObj.hash) {
      pattern += urlObj.hash;
    }
    
    return pattern;
  } catch (error) {
    console.warn('[FieldStorage] URL 패턴 생성 실패:', error);
    return url;
  }
}

/**
 * URL이 패턴과 매칭되는지 확인
 */
export function urlMatches(currentUrl: string, pattern: string, options?: UrlMatchingOptions): boolean {
  const currentPattern = generateUrlPattern(currentUrl, options);
  
  // 와일드카드 패턴 매칭
  const regexPattern = pattern
    .replace(/\*/g, '[^/]*')     // * → 경로 세그먼트 매칭
    .replace(/\//g, '\\/')       // / 이스케이프
    .replace(/\./g, '\\.');      // . 이스케이프
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(currentPattern);
}
