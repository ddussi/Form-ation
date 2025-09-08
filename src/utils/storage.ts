import type { StoredFormData, StorageKey } from '../types/form.js';
import { storageKeyToString } from './formDetection.js';

/**
 * 사이트별 설정을 저장하기 위한 타입
 */
export interface SiteSettings {
  saveMode: 'ask' | 'always' | 'never';
  autofillMode: 'ask' | 'always' | 'never';
}

/**
 * 폼 데이터를 chrome.storage.local에 저장합니다
 */
export async function saveFormData(
  key: StorageKey, 
  values: Record<string, string>
): Promise<void> {
  const storageKey = storageKeyToString(key);
  
  const data: StoredFormData = {
    fields: values,
    timestamp: Date.now(),
    url: `${key.origin}${key.path}`
  };

  await chrome.storage.local.set({
    [storageKey]: data
  });

  console.log('[Storage] 폼 데이터 저장됨:', {
    key: storageKey,
    fieldCount: Object.keys(values).length,
    url: data.url
  });
}

/**
 * 저장된 폼 데이터를 가져옵니다
 */
export async function getFormData(key: StorageKey): Promise<StoredFormData | null> {
  const storageKey = storageKeyToString(key);
  
  const result = await chrome.storage.local.get(storageKey);
  const data = result[storageKey] as StoredFormData | undefined;
  
  if (data) {
    console.log('[Storage] 폼 데이터 로드됨:', {
      key: storageKey,
      fieldCount: Object.keys(data.fields).length,
      timestamp: new Date(data.timestamp).toLocaleString()
    });
  }
  
  return data || null;
}

/**
 * 특정 폼의 데이터를 삭제합니다
 */
export async function deleteFormData(key: StorageKey): Promise<void> {
  const storageKey = storageKeyToString(key);
  await chrome.storage.local.remove(storageKey);
  
  console.log('[Storage] 폼 데이터 삭제됨:', storageKey);
}

/**
 * 사이트별 설정을 저장합니다
 */
export async function saveSiteSettings(
  origin: string, 
  formSignature: string, 
  settings: Partial<SiteSettings>
): Promise<void> {
  const settingsKey = `settings_${origin}_${formSignature}`;
  
  // 기존 설정 가져오기
  const existing = await getSiteSettings(origin, formSignature);
  const updatedSettings = { ...existing, ...settings };
  
  await chrome.storage.local.set({
    [settingsKey]: updatedSettings
  });

  console.log('[Storage] 사이트 설정 저장됨:', {
    origin,
    formSignature,
    settings: updatedSettings
  });
}

/**
 * 사이트별 설정을 가져옵니다
 */
export async function getSiteSettings(
  origin: string, 
  formSignature: string
): Promise<SiteSettings> {
  const settingsKey = `settings_${origin}_${formSignature}`;
  
  const result = await chrome.storage.local.get(settingsKey);
  const settings = result[settingsKey] as SiteSettings | undefined;
  
  // 기본값
  return {
    saveMode: 'ask',
    autofillMode: 'ask',
    ...settings
  };
}

/**
 * 사이트별 설정을 초기화합니다
 */
export async function resetSiteSettings(
  origin: string, 
  formSignature: string
): Promise<void> {
  const settingsKey = `settings_${origin}_${formSignature}`;
  await chrome.storage.local.remove(settingsKey);
  
  console.log('[Storage] 사이트 설정 초기화됨:', { origin, formSignature });
}

/**
 * 디버깅용: 모든 저장된 데이터 목록을 가져옵니다
 */
export async function getAllStoredData(): Promise<Record<string, any>> {
  const allData = await chrome.storage.local.get(null);
  console.log('[Storage] 모든 저장된 데이터:', allData);
  return allData;
}

/**
 * 특정 origin의 모든 데이터를 삭제합니다
 */
export async function clearSiteData(origin: string): Promise<void> {
  const allData = await chrome.storage.local.get(null);
  const keysToRemove: string[] = [];
  
  Object.keys(allData).forEach(key => {
    if (key.includes(origin)) {
      keysToRemove.push(key);
    }
  });
  
  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
    console.log('[Storage] 사이트 데이터 삭제됨:', { origin, removedKeys: keysToRemove });
  }
}
