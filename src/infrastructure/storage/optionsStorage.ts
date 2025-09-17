// Options 페이지용 저장소 관리 함수들

import type { SiteSettings, StoredFormData } from '../../shared/types';

/**
 * Options 페이지에서 사용하는 폼 데이터 항목 타입
 */
export interface FormDataItem {
  storageKey: string;        // 전체 저장소 키
  origin: string;            // 사이트 origin
  path: string;              // URL 경로
  formSignature: string;     // 폼 서명
  data: StoredFormData;      // 저장된 폼 데이터
  settings: SiteSettings;    // 사이트 설정
}

/**
 * 모든 폼 데이터를 가져와서 Options 페이지용으로 변환
 */
export async function getAllFormData(): Promise<FormDataItem[]> {
  const allData = await chrome.storage.local.get(null);
  const formDataItems: FormDataItem[] = [];
  
  // 폼 데이터 키들만 필터링 (form_ 접두사로 시작)
  const formKeys = Object.keys(allData).filter(key => key.startsWith('form_'));
  
  for (const storageKey of formKeys) {
    try {
      // 저장소 키에서 origin, path, formSignature 추출
      // 형식: "form_https://example.com/path_fields_name1|name2"
      const keyParts = storageKey.replace('form_', '').split('_');
      
      if (keyParts.length < 3) continue;
      
      // URL 부분 재구성 (URL에 _가 포함될 수 있음)
      const formSignature = keyParts[keyParts.length - 1];
      const urlPart = keyParts.slice(0, -1).join('_');
      
      // origin과 path 분리
      const url = new URL(urlPart);
      const origin = url.origin;
      const path = url.pathname;
      
      const formData = allData[storageKey] as StoredFormData;
      const settings = await getSiteSettings(origin, formSignature);
      
      formDataItems.push({
        storageKey,
        origin,
        path,
        formSignature,
        data: formData,
        settings
      });
    } catch (error) {
      console.warn('[OptionsStorage] 잘못된 저장소 키 형식:', storageKey, error);
    }
  }
  
  // 최신 순으로 정렬
  return formDataItems.sort((a, b) => b.data.timestamp - a.data.timestamp);
}

/**
 * 사이트별 설정 가져오기
 */
async function getSiteSettings(origin: string, formSignature: string): Promise<SiteSettings> {
  const settingsKey = `settings_${origin}_${formSignature}`;
  const result = await chrome.storage.local.get(settingsKey);
  const settings = result[settingsKey] as SiteSettings | undefined;
  
  return {
    saveMode: 'ask',
    autofillMode: 'ask',
    ...settings
  };
}

/**
 * 특정 폼 데이터 삭제
 */
export async function deleteFormData(storageKey: string): Promise<void> {
  await chrome.storage.local.remove(storageKey);
  console.log('[OptionsStorage] 폼 데이터 삭제됨:', storageKey);
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
    console.log('[OptionsStorage] 사이트 데이터 삭제됨:', { origin, keysRemoved: keysToRemove.length });
  }
}

/**
 * 모든 데이터 삭제
 */
export async function deleteAllData(): Promise<void> {
  await chrome.storage.local.clear();
  console.log('[OptionsStorage] 모든 데이터 삭제됨');
}

/**
 * 폼 설정 업데이트
 */
export async function updateFormSettings(
  origin: string,
  formSignature: string,
  updates: Partial<SiteSettings>
): Promise<void> {
  const settingsKey = `settings_${origin}_${formSignature}`;
  const current = await getSiteSettings(origin, formSignature);
  const updated = { ...current, ...updates };
  
  await chrome.storage.local.set({
    [settingsKey]: updated
  });
  
  console.log('[OptionsStorage] 설정 업데이트됨:', { origin, formSignature, updates });
}

/**
 * 저장소 사용량 정보 조회
 */
export async function getStorageInfo(): Promise<{
  bytesInUse: number;
  itemCount: number;
  formDataCount: number;
}> {
  const allData = await chrome.storage.local.get(null);
  const allKeys = Object.keys(allData);
  
  // 폼 데이터 개수 (form_ 접두사)
  const formDataCount = allKeys.filter(key => key.startsWith('form_')).length;
  
  // 사용 용량 계산 (JSON 문자열 길이로 추정)
  const bytesInUse = JSON.stringify(allData).length;
  
  return {
    bytesInUse,
    itemCount: allKeys.length,
    formDataCount
  };
}
