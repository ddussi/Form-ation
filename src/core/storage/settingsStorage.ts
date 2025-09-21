import type { SiteSettings } from '../../shared/types';

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
