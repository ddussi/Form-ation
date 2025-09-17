import type { GlobalSaveMode } from '../../shared/types';

const GLOBAL_SAVE_MODE_KEY = 'global_save_mode';

/**
 * 글로벌 저장 모드 상태를 가져옵니다
 */
export async function getGlobalSaveMode(): Promise<GlobalSaveMode> {
  const result = await chrome.storage.local.get(GLOBAL_SAVE_MODE_KEY);
  const data = result[GLOBAL_SAVE_MODE_KEY] as GlobalSaveMode | undefined;
  
  // 기본값: OFF 상태
  const defaultMode: GlobalSaveMode = {
    isEnabled: false,
  };
  
  return data || defaultMode;
}

/**
 * 글로벌 저장 모드 상태를 설정합니다
 */
export async function setGlobalSaveMode(isEnabled: boolean): Promise<void> {
  const saveMode: GlobalSaveMode = {
    isEnabled,
  };
  
  await chrome.storage.local.set({
    [GLOBAL_SAVE_MODE_KEY]: saveMode
  });
  
  console.log('[Storage] 글로벌 저장 모드 변경됨:', saveMode);
}

/**
 * 글로벌 저장 모드를 토글합니다
 */
export async function toggleGlobalSaveMode(): Promise<boolean> {
  const currentMode = await getGlobalSaveMode();
  const newState = !currentMode.isEnabled;
  
  await setGlobalSaveMode(newState);
  
  console.log('[Storage] 저장 모드 토글됨:', { 
    이전: currentMode.isEnabled ? 'ON' : 'OFF', 
    현재: newState ? 'ON' : 'OFF' 
  });
  
  return newState;
}
