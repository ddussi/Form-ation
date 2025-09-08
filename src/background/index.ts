import { BrowserNotificationManager } from '../utils/browserNotification.js';
import { saveFormData, saveSiteSettings } from '../utils/storage.js';

// 알림 매니저 인스턴스 생성
const notificationManager = new BrowserNotificationManager();

chrome.runtime.onInstalled.addListener((): void => {
  console.log('[background] installed');
});

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse): boolean | void => {
  console.log('[Background] 메시지 받음:', message);
  
  if (!message || typeof message !== 'object') return;

  const msg = message as any;

  switch (msg.type) {
    case 'PING':
      sendResponse({ type: 'PONG', from: 'background' });
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
            () => {
              console.log('[Background] 저장 선택됨');
              chrome.tabs.sendMessage(sender.tab?.id!, {
                type: 'SAVE_NOTIFICATION_RESPONSE',
                action: 'save',
                requestId: msg.requestId
              });
            },
            () => {
              console.log('[Background] 취소 선택됨');
              chrome.tabs.sendMessage(sender.tab?.id!, {
                type: 'SAVE_NOTIFICATION_RESPONSE', 
                action: 'cancel',
                requestId: msg.requestId
              });
            },
            () => {
              console.log('[Background] 다시 묻지 않음 선택됨');
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


