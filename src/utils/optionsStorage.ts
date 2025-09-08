// Options 페이지에서 사용할 저장소 관리 유틸리티

import type { StoredFormData, SiteSettings } from './storage.js';

export interface FormDataItem {
  storageKey: string;
  origin: string;
  path: string;
  formSignature: string;
  data: StoredFormData;
  settings: SiteSettings;
}

/**
 * 모든 저장된 폼 데이터를 가져와서 구조화된 형태로 반환
 */
export async function getAllFormData(): Promise<FormDataItem[]> {
  const allData = await chrome.storage.local.get(null);
  const formDataItems: FormDataItem[] = [];

  // 폼 데이터만 필터링 (form_ 접두어가 있는 것들)
  const formDataKeys = Object.keys(allData).filter(key => key.startsWith('form_'));
  
  for (const storageKey of formDataKeys) {
    const data = allData[storageKey] as StoredFormData;
    
    // 키에서 정보 추출: form_origin_path_signature
    const keyParts = storageKey.replace('form_', '').split('_');
    if (keyParts.length < 3) continue;
    
    // URL 파싱으로 정확한 origin/path 추출
    try {
      const url = new URL(data.url);
      const origin = url.origin;
      const path = url.pathname;
      
      // 폼 서명 추출
      const formSignature = keyParts[keyParts.length - 1];
      
      // 해당 사이트의 설정 가져오기
      const settingsKey = `settings_${origin}_${formSignature}`;
      const settings = allData[settingsKey] as SiteSettings || {
        saveMode: 'ask',
        autofillMode: 'ask'
      };

      formDataItems.push({
        storageKey,
        origin,
        path,
        formSignature,
        data,
        settings
      });
    } catch (error) {
      console.error('폼 데이터 파싱 에러:', error, storageKey);
    }
  }

  // 도메인별, 경로별로 정렬
  return formDataItems.sort((a, b) => {
    if (a.origin !== b.origin) {
      return a.origin.localeCompare(b.origin);
    }
    return a.path.localeCompare(b.path);
  });
}

/**
 * 특정 폼 데이터 삭제
 */
export async function deleteFormData(storageKey: string): Promise<void> {
  await chrome.storage.local.remove(storageKey);
}

/**
 * 특정 사이트의 모든 데이터 삭제
 */
export async function deleteSiteData(origin: string): Promise<void> {
  const allData = await chrome.storage.local.get(null);
  const keysToRemove: string[] = [];

  Object.keys(allData).forEach(key => {
    // 폼 데이터와 설정 데이터 모두 삭제
    if (key.includes(origin)) {
      keysToRemove.push(key);
    }
  });

  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
  }
}

/**
 * 모든 폼 데이터 삭제 (확장 프로그램 전체 초기화)
 */
export async function deleteAllData(): Promise<void> {
  await chrome.storage.local.clear();
}

/**
 * 특정 폼의 설정 업데이트
 */
export async function updateFormSettings(
  origin: string,
  formSignature: string,
  settings: Partial<SiteSettings>
): Promise<void> {
  const settingsKey = `settings_${origin}_${formSignature}`;
  
  // 기존 설정 가져오기
  const result = await chrome.storage.local.get(settingsKey);
  const existingSettings = result[settingsKey] as SiteSettings || {
    saveMode: 'ask',
    autofillMode: 'ask'
  };

  // 설정 업데이트
  const updatedSettings = { ...existingSettings, ...settings };
  await chrome.storage.local.set({
    [settingsKey]: updatedSettings
  });
}

/**
 * 저장소 사용량 정보 가져오기
 */
export async function getStorageInfo(): Promise<{
  bytesInUse: number;
  itemCount: number;
  formDataCount: number;
}> {
  const allData = await chrome.storage.local.get(null);
  const bytesInUse = await chrome.storage.local.getBytesInUse();
  
  const itemCount = Object.keys(allData).length;
  const formDataCount = Object.keys(allData).filter(key => key.startsWith('form_')).length;

  return {
    bytesInUse,
    itemCount,
    formDataCount
  };
}
