// Options 페이지용 저장소 관리 함수들

import type { SiteSettings } from '../../shared/types';
import type { StoredFormData } from '../../types/form';
import type { FieldMemory } from '../../types/fieldMemory';
import { getAllFieldMemories, deleteFieldMemory } from '../../features/field-memory/fieldMemoryStorage';

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
  isFieldMemory?: boolean;   // 필드 메모리 데이터 여부
  fieldMemory?: FieldMemory; // 필드 메모리 원본 데이터 (필드 메모리인 경우)
}

/**
 * 모든 폼 데이터를 가져와서 Options 페이지용으로 변환
 */
export async function getAllFormData(): Promise<FormDataItem[]> {
  const formDataItems: FormDataItem[] = [];
  
  // 1. 기존 폼 데이터 가져오기 (form_ 접두사)
  const allData = await chrome.storage.local.get(null);
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
  
  // 2. 필드 메모리 데이터 가져오기 (field_memory_ 접두사)
  try {
    const fieldMemories = await getAllFieldMemories();
    
    for (const fieldMemory of fieldMemories) {
      try {
        const url = new URL(fieldMemory.url);
        const origin = url.origin;
        const path = url.pathname + url.search;
        
        // 필드 메모리를 FormDataItem 형식으로 변환
        const convertedFields: { [key: string]: any } = {};
        fieldMemory.fields.forEach(field => {
          convertedFields[field.label || field.selector] = field.value;
        });
        
        const formDataItem: FormDataItem = {
          storageKey: `field_memory_${fieldMemory.id}`,
          origin,
          path,
          formSignature: fieldMemory.title,
          data: {
            fields: convertedFields,
            timestamp: fieldMemory.timestamp,
            url: fieldMemory.url,
          },
          settings: {
            saveMode: 'ask',
            autofillMode: 'ask',
          },
          isFieldMemory: true,
          fieldMemory: fieldMemory,
        };
        
        formDataItems.push(formDataItem);
      } catch (error) {
        console.warn('[OptionsStorage] 필드 메모리 변환 실패:', fieldMemory.id, error);
      }
    }
  } catch (error) {
    console.error('[OptionsStorage] 필드 메모리 로드 실패:', error);
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
  if (storageKey.startsWith('field_memory_')) {
    // 필드 메모리 데이터인 경우
    const memoryId = storageKey.replace('field_memory_', '');
    await deleteFieldMemory(memoryId);
    console.log('[OptionsStorage] 필드 메모리 삭제됨:', memoryId);
  } else {
    // 기존 폼 데이터인 경우
    await chrome.storage.local.remove(storageKey);
    console.log('[OptionsStorage] 폼 데이터 삭제됨:', storageKey);
  }
}

/**
 * 특정 사이트의 모든 데이터 삭제
 */
export async function deleteSiteData(origin: string): Promise<void> {
  // 1. 기존 폼 데이터 삭제
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
  
  // 2. 필드 메모리 데이터 삭제
  try {
    const fieldMemories = await getAllFieldMemories();
    const memoriesToDelete = fieldMemories.filter(memory => {
      try {
        const memoryUrl = new URL(memory.url);
        return memoryUrl.origin === origin;
      } catch {
        return false;
      }
    });
    
    for (const memory of memoriesToDelete) {
      await deleteFieldMemory(memory.id);
    }
    
    console.log('[OptionsStorage] 사이트 데이터 삭제됨:', { 
      origin, 
      legacyKeysRemoved: keysToRemove.length,
      fieldMemoriesRemoved: memoriesToDelete.length
    });
  } catch (error) {
    console.error('[OptionsStorage] 사이트 필드 메모리 삭제 중 오류:', error);
  }
}

/**
 * 모든 데이터 삭제
 */
export async function deleteAllData(): Promise<void> {
  // 1. 모든 Chrome storage 데이터 삭제
  await chrome.storage.local.clear();
  
  // 2. 필드 메모리 인덱스도 함께 정리 (clearAllFieldMemories는 이미 clear 후에 호출할 필요 없음)
  console.log('[OptionsStorage] 모든 데이터 삭제됨 (기존 폼 데이터 + 필드 메모리)');
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
