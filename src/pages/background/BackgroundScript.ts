/**
 * Background Script: 간단한 MVP 버전
 */

import { getGlobalSaveMode, setGlobalSaveMode } from '../../utils/simpleStorage';

chrome.runtime.onInstalled.addListener(async (): Promise<void> => {
  console.log('[Background] Form-ation 설치됨');
  
  // 초기 아이콘 상태 설정
  await updateIconState();
});

/**
 * 저장 모드 상태에 따라 확장 아이콘 상태를 업데이트
 */
async function updateIconState(): Promise<void> {
  try {
    const saveMode = await getGlobalSaveMode();
    
    if (saveMode.isEnabled) {
      // ON 상태: 빨간 배지 표시
      await chrome.action.setBadgeText({ text: 'ON' });
      await chrome.action.setBadgeBackgroundColor({ color: '#FF4444' });
      await chrome.action.setTitle({ title: 'Form-ation 저장 모드: ON' });
    } else {
      // OFF 상태: 배지 없음
      await chrome.action.setBadgeText({ text: '' });
      await chrome.action.setTitle({ title: 'Form-ation 저장 모드: OFF' });
    }
    
    console.log('[Background] 아이콘 상태 업데이트:', saveMode.isEnabled ? 'ON' : 'OFF');
  } catch (error) {
    console.error('[Background] 아이콘 상태 업데이트 실패:', error);
  }
}

/**
 * 저장 모드 토글 처리
 */
async function handleSaveModeToggle(isEnabled: boolean, sendResponse: any): Promise<void> {
  console.log('[Background] 저장 모드 토글 요청:', isEnabled ? 'ON' : 'OFF');
  
  try {
    // 저장 모드 설정
    await setGlobalSaveMode(isEnabled);
    
    // 아이콘 상태 업데이트
    await updateIconState();
    
    // 모든 탭에 상태 변경 알림
    const tabs = await chrome.tabs.query({});
    tabs.forEach((tab: any) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'SAVE_MODE_CHANGED',
          isEnabled: isEnabled
        }).catch(() => {
          // content script가 없는 탭에서는 에러 무시
        });
      }
    });
    
    console.log('[Background] 저장 모드 토글 완료:', isEnabled ? 'ON' : 'OFF');
    sendResponse({ success: true, isEnabled: isEnabled });
    
  } catch (error) {
    console.error('[Background] 저장 모드 토글 실패:', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * 메시지 리스너
 */
chrome.runtime.onMessage.addListener((message: unknown, _sender: any, sendResponse: any): boolean | void => {
  console.log('[Background] 메시지 받음:', message);
  
  if (!message || typeof message !== 'object') return;

  const msg = message as any;

  switch (msg.type) {
    case 'PING':
      sendResponse({ type: 'PONG', from: 'background' });
      return true;

    case 'UPDATE_ICON_STATE':
      // Content script에서 상태 변경 요청
      updateIconState();
      return true;

    case 'GET_SAVE_MODE_STATUS':
      // 팝업에서 현재 저장 모드 상태 요청
      getGlobalSaveMode()
        .then(saveMode => {
          sendResponse({ isEnabled: saveMode.isEnabled });
        })
        .catch(error => {
          console.error('[Background] 저장 모드 상태 조회 실패:', error);
          sendResponse({ isEnabled: false });
        });
      return true;

    case 'TOGGLE_SAVE_MODE':
      // 팝업에서 저장 모드 토글 요청
      handleSaveModeToggle(msg.isEnabled, sendResponse);
      return true;

    default:
      console.log('[Background] 알 수 없는 메시지 타입:', msg.type);
      break;
  }
});

console.log('[Background] Form-ation Background Script 로드됨');