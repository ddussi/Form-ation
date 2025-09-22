/**
 * 간단한 브라우저 알림 - MVP용
 */

export interface NotificationCallbacks {
  onSave: () => void;
  onCancel: () => void;
  onNever: () => void;
}

/**
 * 저장 확인 알림 표시
 */
export function showSaveConfirmNotification(
  fieldCount: number,
  siteName: string,
  callbacks: NotificationCallbacks
): void {
  
  const notificationId = `save_${Date.now()}`;
  
  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: '💾 Form-ation',
    message: `${siteName}에서 ${fieldCount}개 필드를 저장하시겠습니까?`,
    buttons: [
      { title: '저장' },
      { title: '취소' }
    ],
    requireInteraction: true
  });

  // 버튼 클릭 이벤트
  chrome.notifications.onButtonClicked.addListener((id: string, buttonIndex: number) => {
    if (id === notificationId) {
      chrome.notifications.clear(id);
      
      if (buttonIndex === 0) {
        // 저장
        callbacks.onSave();
      } else {
        // 취소
        callbacks.onCancel();
      }
    }
  });

  // 알림 클릭 이벤트 (저장으로 처리)
  chrome.notifications.onClicked.addListener((id: string) => {
    if (id === notificationId) {
      chrome.notifications.clear(id);
      callbacks.onSave();
    }
  });

  // 자동 사라짐 처리 (취소로 처리)
  chrome.notifications.onClosed.addListener((id: string, byUser: boolean) => {
    if (id === notificationId && byUser) {
      callbacks.onCancel();
    }
  });
}

/**
 * 간단한 정보 알림
 */
export function showInfoNotification(title: string, message: string): void {
  const notificationId = `info_${Date.now()}`;
  
  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title,
    message
  });

  // 3초 후 자동 삭제
  setTimeout(() => {
    chrome.notifications.clear(notificationId);
  }, 3000);
}

/**
 * 간단한 토스트 스타일 알림 (DOM에 직접 표시)
 */
export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000000;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease;
  `;
  
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = `${icon} ${message}`;
  
  document.body.appendChild(toast);
  
  // 3초 후 제거
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }
  }, 3000);
}

// CSS 애니메이션 추가
if (!document.querySelector('#formation-toast-styles')) {
  const style = document.createElement('style');
  style.id = 'formation-toast-styles';
  style.textContent = `
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `;
  document.head.appendChild(style);
}
