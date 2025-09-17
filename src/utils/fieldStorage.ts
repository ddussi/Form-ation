/**
 * 셀렉터 모드 기반 필드 기억 저장소 관리
 * 기존 storage.ts와 독립적으로 동작
 */

import type {
  FieldMemory,
  FieldMemoryStats,
  UrlMatchingOptions,
} from '../types/fieldMemory';
import {
  DEFAULT_URL_MATCHING_OPTIONS,
} from '../types/fieldMemory';

/**
 * 필드 메모리 인덱스 (URL별 빠른 검색을 위함)
 */
interface FieldMemoryIndex {
  [urlPattern: string]: string[]; // URL 패턴 → 메모리 ID 배열
}

/**
 * 필드 메모리 설정
 */
interface FieldMemorySettings {
  maxMemoriesPerSite: number;
  maxTotalMemories: number;
  autoCleanupDays: number;
  urlMatchingOptions: UrlMatchingOptions;
}

const DEFAULT_SETTINGS: FieldMemorySettings = {
  maxMemoriesPerSite: 10,
  maxTotalMemories: 1000,
  autoCleanupDays: 365,
  urlMatchingOptions: DEFAULT_URL_MATCHING_OPTIONS,
};

// 저장소 키 상수들
const STORAGE_KEYS = {
  MEMORY_PREFIX: 'field_memory_',
  INDEX: 'field_memory_index',
  SETTINGS: 'field_memory_settings',
} as const;

/**
 * UUID 생성
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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

/**
 * 필드 메모리 저장
 */
export async function saveFieldMemory(memory: Omit<FieldMemory, 'id' | 'timestamp'>): Promise<string> {
  const id = generateId();
  const timestamp = Date.now();
  
  const fullMemory: FieldMemory = {
    ...memory,
    id,
    timestamp,
    useCount: 0,
  };
  
  // 1. 메모리 저장
  const memoryKey = `${STORAGE_KEYS.MEMORY_PREFIX}${id}`;
  await chrome.storage.local.set({
    [memoryKey]: fullMemory
  });
  
  // 2. 인덱스 업데이트
  await updateIndex(fullMemory.urlPattern, id);
  
  // 3. 자동 정리 (비동기)
  setTimeout(() => autoCleanup(), 1000);
  
  console.log('[FieldStorage] 필드 메모리 저장됨:', {
    id,
    url: memory.url,
    fieldCount: memory.fields.length,
  });
  
  return id;
}

/**
 * URL로 필드 메모리 검색
 */
export async function getFieldMemoriesByUrl(url: string): Promise<FieldMemory[]> {
  const settings = await getSettings();
  
  const index = await getIndex();
  const memories: FieldMemory[] = [];
  
  // 패턴 매칭으로 관련 메모리들 찾기
  for (const [urlPattern, memoryIds] of Object.entries(index)) {
    if (urlMatches(url, urlPattern, settings.urlMatchingOptions)) {
      for (const memoryId of memoryIds) {
        const memory = await getFieldMemoryById(memoryId);
        if (memory) {
          memories.push(memory);
        }
      }
    }
  }
  
  // 사용 횟수와 최근 사용 시간으로 정렬
  return memories.sort((a, b) => {
    if (a.useCount !== b.useCount) {
      return b.useCount - a.useCount; // 사용 횟수 내림차순
    }
    return (b.lastUsed || b.timestamp) - (a.lastUsed || a.timestamp); // 최근 사용 시간 내림차순
  });
}

/**
 * ID로 필드 메모리 조회
 */
export async function getFieldMemoryById(id: string): Promise<FieldMemory | null> {
  const memoryKey = `${STORAGE_KEYS.MEMORY_PREFIX}${id}`;
  const result = await chrome.storage.local.get(memoryKey);
  return result[memoryKey] || null;
}

/**
 * 모든 필드 메모리 조회
 */
export async function getAllFieldMemories(): Promise<FieldMemory[]> {
  const result = await chrome.storage.local.get(null);
  const memories: FieldMemory[] = [];
  
  for (const [key, value] of Object.entries(result)) {
    if (key.startsWith(STORAGE_KEYS.MEMORY_PREFIX)) {
      memories.push(value as FieldMemory);
    }
  }
  
  return memories.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * 필드 메모리 삭제
 */
export async function deleteFieldMemory(id: string): Promise<void> {
  const memory = await getFieldMemoryById(id);
  if (!memory) return;
  
  // 1. 메모리 삭제
  const memoryKey = `${STORAGE_KEYS.MEMORY_PREFIX}${id}`;
  await chrome.storage.local.remove(memoryKey);
  
  // 2. 인덱스에서 제거
  await removeFromIndex(memory.urlPattern, id);
  
  console.log('[FieldStorage] 필드 메모리 삭제됨:', id);
}

/**
 * 필드 메모리 업데이트
 */
export async function updateFieldMemory(id: string, updates: Partial<FieldMemory>): Promise<void> {
  const memory = await getFieldMemoryById(id);
  if (!memory) return;
  
  const updatedMemory = { ...memory, ...updates };
  const memoryKey = `${STORAGE_KEYS.MEMORY_PREFIX}${id}`;
  
  await chrome.storage.local.set({
    [memoryKey]: updatedMemory
  });
  
  // URL 패턴이 변경된 경우 인덱스 업데이트
  if (updates.urlPattern && updates.urlPattern !== memory.urlPattern) {
    await removeFromIndex(memory.urlPattern, id);
    await updateIndex(updates.urlPattern, id);
  }
}

/**
 * 필드 메모리 사용 기록 (사용 횟수, 마지막 사용 시간 업데이트)
 */
export async function recordFieldMemoryUsage(id: string): Promise<void> {
  const memory = await getFieldMemoryById(id);
  if (!memory) return;
  
  await updateFieldMemory(id, {
    useCount: memory.useCount + 1,
    lastUsed: Date.now(),
  });
}

/**
 * 사이트별 필드 메모리 삭제
 */
export async function deleteFieldMemoriesBySite(domain: string): Promise<number> {
  const allMemories = await getAllFieldMemories();
  let deletedCount = 0;
  
  for (const memory of allMemories) {
    try {
      const memoryUrl = new URL(memory.url);
      if (memoryUrl.hostname === domain) {
        await deleteFieldMemory(memory.id);
        deletedCount++;
      }
    } catch (error) {
      console.warn('[FieldStorage] URL 파싱 실패:', memory.url, error);
    }
  }
  
  return deletedCount;
}

/**
 * 필드 메모리 통계 조회
 */
export async function getFieldMemoryStats(): Promise<FieldMemoryStats> {
  const allMemories = await getAllFieldMemories();
  
  // 도메인별 사용 횟수 집계
  const domainCounts = new Map<string, number>();
  let totalFields = 0;
  
  for (const memory of allMemories) {
    try {
      const url = new URL(memory.url);
      const domain = url.hostname;
      domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
      totalFields += memory.fields.length;
    } catch (error) {
      console.warn('[FieldStorage] URL 파싱 실패:', memory.url, error);
    }
  }
  
  // 가장 많이 사용된 사이트들
  const mostUsedSites = Array.from(domainCounts.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // 최근 사용된 메모리들
  const recentlyUsed = allMemories
    .filter(m => m.lastUsed)
    .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
    .slice(0, 10);
  
  // 저장 공간 사용량 추정
  const storageSize = JSON.stringify(allMemories).length;
  
  return {
    totalMemories: allMemories.length,
    totalFields,
    mostUsedSites,
    recentlyUsed,
    storageSize,
  };
}

/**
 * 인덱스 조회
 */
async function getIndex(): Promise<FieldMemoryIndex> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.INDEX);
  return result[STORAGE_KEYS.INDEX] || {};
}

/**
 * 인덱스 업데이트
 */
async function updateIndex(urlPattern: string, memoryId: string): Promise<void> {
  const index = await getIndex();
  
  if (!index[urlPattern]) {
    index[urlPattern] = [];
  }
  
  if (!index[urlPattern].includes(memoryId)) {
    index[urlPattern].push(memoryId);
  }
  
  await chrome.storage.local.set({
    [STORAGE_KEYS.INDEX]: index
  });
}

/**
 * 인덱스에서 제거
 */
async function removeFromIndex(urlPattern: string, memoryId: string): Promise<void> {
  const index = await getIndex();
  
  if (index[urlPattern]) {
    index[urlPattern] = index[urlPattern].filter(id => id !== memoryId);
    
    // 빈 패턴 제거
    if (index[urlPattern].length === 0) {
      delete index[urlPattern];
    }
  }
  
  await chrome.storage.local.set({
    [STORAGE_KEYS.INDEX]: index
  });
}

/**
 * 설정 조회
 */
export async function getSettings(): Promise<FieldMemorySettings> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] };
}

/**
 * 설정 업데이트
 */
export async function updateSettings(settings: Partial<FieldMemorySettings>): Promise<void> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  
  await chrome.storage.local.set({
    [STORAGE_KEYS.SETTINGS]: updated
  });
}

/**
 * 자동 정리 (오래된 메모리, 사용 안 하는 메모리 삭제)
 */
async function autoCleanup(): Promise<void> {
  const settings = await getSettings();
  const allMemories = await getAllFieldMemories();
  
  const now = Date.now();
  const cutoffTime = now - (settings.autoCleanupDays * 24 * 60 * 60 * 1000);
  
  // 1. 오래된 메모리 삭제
  const oldMemories = allMemories.filter(memory => 
    memory.timestamp < cutoffTime && !memory.lastUsed
  );
  
  for (const memory of oldMemories) {
    await deleteFieldMemory(memory.id);
  }
  
  // 2. 전체 제한 확인 (오래된 것부터 삭제)
  const remainingMemories = await getAllFieldMemories();
  if (remainingMemories.length > settings.maxTotalMemories) {
    const toDelete = remainingMemories
      .sort((a, b) => (a.lastUsed || a.timestamp) - (b.lastUsed || b.timestamp))
      .slice(0, remainingMemories.length - settings.maxTotalMemories);
    
    for (const memory of toDelete) {
      await deleteFieldMemory(memory.id);
    }
  }
  
  console.log('[FieldStorage] 자동 정리 완료:', {
    deletedOld: oldMemories.length,
    totalRemaining: (await getAllFieldMemories()).length,
  });
}

/**
 * 전체 데이터 초기화 (개발/테스트용)
 */
export async function clearAllFieldMemories(): Promise<void> {
  const allKeys = await chrome.storage.local.get(null);
  const keysToRemove = Object.keys(allKeys).filter(key => 
    key.startsWith(STORAGE_KEYS.MEMORY_PREFIX) || 
    key === STORAGE_KEYS.INDEX ||
    key === STORAGE_KEYS.SETTINGS
  );
  
  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
  }
  
  console.log('[FieldStorage] 모든 필드 메모리 삭제됨:', keysToRemove.length);
}
