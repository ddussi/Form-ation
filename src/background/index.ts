import { BrowserNotificationManager } from '../utils/browserNotification.js';
import { saveFormData, saveSiteSettings, toggleGlobalSaveMode, getGlobalSaveMode } from '../utils/storage.js';

// 알림 매니저 인스턴스 생성
const notificationManager = new BrowserNotificationManager();

chrome.runtime.onInstalled.addListener(async (): Promise<void> => {
  console.log('[background] installed');
  
  // 초기 아이콘 상태 설정
  await updateIconState();
});

// 확장 아이콘 클릭 이벤트 처리 (저장 모드 토글)
chrome.action.onClicked.addListener(async (): Promise<void> => {
  console.log('[background] 확장 아이콘 클릭됨');
  
  try {
    // 저장 모드 토글
    const newState = await toggleGlobalSaveMode();
    
    // 아이콘 상태 업데이트
    await updateIconState();
    
    // 모든 탭에 상태 변경 알림
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'SAVE_MODE_CHANGED',
          isEnabled: newState
        }).catch(() => {
          // content script가 없는 탭에서는 에러 무시
        });
      }
    });
    
    console.log('[background] 저장 모드 토글 완료:', newState ? 'ON' : 'OFF');
  } catch (error) {
    console.error('[background] 저장 모드 토글 실패:', error);
  }
});

/**
 * 저장 모드 상태에 따라 확장 아이콘 상태를 업데이트합니다
 */
async function updateIconState(): Promise<void> {
  try {
    const saveMode = await getGlobalSaveMode();
    
    if (saveMode.isEnabled) {
      // ON 상태: 빨간 배지 표시
      await chrome.action.setBadgeText({ text: 'ON' });
      await chrome.action.setBadgeBackgroundColor({ color: '#FF4444' });
      await chrome.action.setTitle({ title: 'Form-ation 저장 모드: ON (클릭하여 OFF)' });
    } else {
      // OFF 상태: 배지 없음
      await chrome.action.setBadgeText({ text: '' });
      await chrome.action.setTitle({ title: 'Form-ation 저장 모드: OFF (클릭하여 ON)' });
    }
    
    console.log('[background] 아이콘 상태 업데이트됨:', saveMode.isEnabled ? 'ON' : 'OFF');
  } catch (error) {
    console.error('[background] 아이콘 상태 업데이트 실패:', error);
  }
}

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse): boolean | void => {
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

    case 'SHOW_SAVE_NOTIFICATION':
      console.log('[Background] 저장 알림 요청:', msg);
      
      // 알림 권한 확인
      chrome.notifications.getPermissionLevel((level) => {
        console.log('[Background] 알림 권한 레벨:', level);
        
        if (level === 'denied') {
          console.error('[Background] 알림 권한이 거부됨');
          // 권한 없으면 취소로 처리
          chrome.tabs.sendMessage(sender.tab?.id!, {
            type: 'SAVE_NOTIFICATION_RESPONSE',
            action: 'cancel',
            requestId: msg.requestId
          });
          return;
        }
        
        try {
          notificationManager.showSaveConfirm(
            msg.fieldCount,
            msg.siteName,
            async () => {
              console.log('[Background] 저장 선택됨');
              // 🔑 Background Script에서 직접 저장 실행
              try {
                await saveFormData(msg.formData.storageKey, msg.formData.values);
                console.log('[Background] 폼 데이터 저장 완료');
                
                chrome.tabs.sendMessage(sender.tab?.id!, {
                  type: 'SAVE_NOTIFICATION_RESPONSE',
                  action: 'save',
                  requestId: msg.requestId
                });
              } catch (saveError) {
                console.error('[Background] 저장 실패:', saveError);
                chrome.tabs.sendMessage(sender.tab?.id!, {
                  type: 'SAVE_NOTIFICATION_RESPONSE',
                  action: 'cancel', // 저장 실패 시 취소로 처리
                  requestId: msg.requestId
                });
              }
            },
            () => {
              console.log('[Background] 취소 선택됨');
              chrome.tabs.sendMessage(sender.tab?.id!, {
                type: 'SAVE_NOTIFICATION_RESPONSE', 
                action: 'cancel',
                requestId: msg.requestId
              });
            },
            async () => {
              console.log('[Background] 다시 묻지 않음 선택됨');
              // 🔑 Background Script에서 직접 설정 저장
              try {
                await saveSiteSettings(msg.formData.origin, msg.formData.formSignature, { saveMode: 'never' });
                console.log('[Background] 사이트 설정 저장 완료');
              } catch (settingError) {
                console.error('[Background] 설정 저장 실패:', settingError);
              }
              
              chrome.tabs.sendMessage(sender.tab?.id!, {
                type: 'SAVE_NOTIFICATION_RESPONSE',
                action: 'never',
                requestId: msg.requestId
              });
            }
          );
        } catch (error) {
          console.error('[Background] 알림 생성 에러:', error);
          chrome.tabs.sendMessage(sender.tab?.id!, {
            type: 'SAVE_NOTIFICATION_RESPONSE',
            action: 'cancel',
            requestId: msg.requestId
          });
        }
      });
      return true;

    case 'SHOW_AUTOFILL_NOTIFICATION':
      notificationManager.showAutofillConfirm(
        msg.fieldCount,
        msg.siteName,
        msg.previewFields,
        () => {
          // 자동입력 선택
          chrome.tabs.sendMessage(sender.tab?.id!, {
            type: 'AUTOFILL_NOTIFICATION_RESPONSE',
            action: 'fill',
            requestId: msg.requestId
          });
        },
        () => {
          // 이번에는 안함
          chrome.tabs.sendMessage(sender.tab?.id!, {
            type: 'AUTOFILL_NOTIFICATION_RESPONSE',
            action: 'cancel', 
            requestId: msg.requestId
          });
        },
        () => {
          // 다시 묻지 않음
          chrome.tabs.sendMessage(sender.tab?.id!, {
            type: 'AUTOFILL_NOTIFICATION_RESPONSE',
            action: 'never',
            requestId: msg.requestId
          });
        }
      );
      return true;
  }
});


