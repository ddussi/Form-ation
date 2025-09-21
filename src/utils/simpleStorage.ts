/**
 * 간단한 저장소 관리 - MVP용
 */

export interface SimpleStoredData {
  fields: Record<string, string>;
  timestamp: number;
  url: string;
}

export interface SimpleStorageKey {
  origin: string;
  path: string;
  signature: string;
}

/**
 * 저장소 키 생성
 */
export function generateStorageKey(url: string, signature: string): SimpleStorageKey {
  const urlObj = new URL(url);
  
  return {
    origin: urlObj.origin,
    path: urlObj.pathname,
    signature
  };
}

/**
 * 저장소 키를 문자열로 변환
 */
export function storageKeyToString(key: SimpleStorageKey): string {
  return `form_${key.origin}_${key.path}_${key.signature}`;
}

/**
 * 폼 데이터 저장
 */
export async function saveFormData(key: SimpleStorageKey, values: Record<string, string>): Promise<void> {
  const storageKey = storageKeyToString(key);
  const data: SimpleStoredData = {
    fields: values,
    timestamp: Date.now(),
    url: key.origin + key.path
  };
  
  await chrome.storage.local.set({
    [storageKey]: data
  });
  
  console.log('[SimpleStorage] 데이터 저장됨:', storageKey, values);
}

/**
 * 폼 데이터 조회
 */
export async function getFormData(key: SimpleStorageKey): Promise<SimpleStoredData | null> {
  const storageKey = storageKeyToString(key);
  const result = await chrome.storage.local.get(storageKey);
  
  return result[storageKey] || null;
}

/**
 * 글로벌 저장 모드 상태
 */
export interface GlobalSaveMode {
  isEnabled: boolean;
  lastUpdated: string;
}

/**
 * 글로벌 저장 모드 조회
 */
export async function getGlobalSaveMode(): Promise<GlobalSaveMode> {
  const result = await chrome.storage.local.get('globalSaveMode');
  return result.globalSaveMode || { isEnabled: false, lastUpdated: new Date().toISOString() };
}

/**
 * 글로벌 저장 모드 설정
 */
export async function setGlobalSaveMode(isEnabled: boolean): Promise<void> {
  const saveMode: GlobalSaveMode = {
    isEnabled,
    lastUpdated: new Date().toISOString()
  };
  
  await chrome.storage.local.set({
    globalSaveMode: saveMode
  });
  
  console.log('[SimpleStorage] 저장 모드 변경:', isEnabled ? 'ON' : 'OFF');
}

/**
 * 모든 저장된 데이터 조회 (Options 페이지용)
 */
export async function getAllStoredData(): Promise<Array<{
  key: string;
  data: SimpleStoredData;
}>> {
  const result = await chrome.storage.local.get(null);
  const storedData: Array<{ key: string; data: SimpleStoredData }> = [];
  
  for (const [key, value] of Object.entries(result)) {
    if (key.startsWith('form_') && key !== 'form_selector_mode') {
      storedData.push({
        key,
        data: value as SimpleStoredData
      });
    }
  }
  
  return storedData.sort((a, b) => b.data.timestamp - a.data.timestamp);
}

/**
 * 데이터 삭제
 */
export async function deleteFormData(storageKey: string): Promise<void> {
  await chrome.storage.local.remove(storageKey);
  console.log('[SimpleStorage] 데이터 삭제됨:', storageKey);
}
