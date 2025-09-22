/**
 * 간단한 필드 메모리 저장소 - 셀렉터 모드용
 */

import type { FieldMemory } from '../../types/fieldMemory';

/**
 * 간단한 UUID 생성
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
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
  
  // 메모리 저장
  const memoryKey = `field_memory_${id}`;
  await chrome.storage.local.set({
    [memoryKey]: fullMemory
  });
  
  console.log('[FieldMemoryStorage] 필드 메모리 저장됨:', {
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
  const result = await chrome.storage.local.get(null);
  const memories: FieldMemory[] = [];
  
  const targetUrl = new URL(url);
  
  for (const [key, value] of Object.entries(result)) {
    if (key.startsWith('field_memory_')) {
      const memory = value as FieldMemory;
      
      try {
        const memoryUrl = new URL(memory.url);
        // 같은 호스트의 메모리만 반환
        if (memoryUrl.hostname === targetUrl.hostname) {
          memories.push(memory);
        }
      } catch (error) {
        console.warn('[FieldMemoryStorage] URL 파싱 실패:', memory.url, error);
      }
    }
  }
  
  return memories.sort((a, b) => (b.lastUsed || b.timestamp) - (a.lastUsed || a.timestamp));
}

/**
 * 모든 필드 메모리 조회
 */
export async function getAllFieldMemories(): Promise<FieldMemory[]> {
  const result = await chrome.storage.local.get(null);
  const memories: FieldMemory[] = [];
  
  for (const [key, value] of Object.entries(result)) {
    if (key.startsWith('field_memory_')) {
      memories.push(value as FieldMemory);
    }
  }
  
  return memories.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * 필드 메모리 삭제
 */
export async function deleteFieldMemory(id: string): Promise<void> {
  const memoryKey = `field_memory_${id}`;
  await chrome.storage.local.remove(memoryKey);
  
  console.log('[FieldMemoryStorage] 필드 메모리 삭제됨:', id);
}

/**
 * 필드 메모리 사용 기록 업데이트
 */
export async function recordFieldMemoryUsage(id: string): Promise<void> {
  const memoryKey = `field_memory_${id}`;
  const result = await chrome.storage.local.get(memoryKey);
  const memory = result[memoryKey] as FieldMemory;
  
  if (memory) {
    memory.useCount = (memory.useCount || 0) + 1;
    memory.lastUsed = Date.now();
    
    await chrome.storage.local.set({
      [memoryKey]: memory
    });
    
    console.log('[FieldMemoryStorage] 사용 기록 업데이트:', id);
  }
}

/**
 * 간단한 URL 패턴 생성
 */
export function generateUrlPattern(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.origin}${urlObj.pathname}`;
  } catch (error) {
    console.warn('[FieldMemoryStorage] URL 패턴 생성 실패:', url, error);
    return url;
  }
}
