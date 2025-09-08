// 브라우저 레벨 알림 시스템 - 페이지 이동과 독립적
// ⚠️ 이 클래스는 background script에서만 사용 가능

export class BrowserNotificationManager {
  private activeNotifications = new Map<string, {
    onSave: () => void;
    onCancel: () => void;
    onNever: () => void;
  }>();

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // 알림 버튼 클릭 처리
    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
      const callbacks = this.activeNotifications.get(notificationId);
      if (!callbacks) return;

      switch (buttonIndex) {
        case 0: // 저장
          callbacks.onSave();
          break;
        case 1: // 이번에는 안함
          callbacks.onCancel();
          break;
        case 2: // 다시 묻지 않음
          callbacks.onNever();
          break;
      }

      this.clearNotification(notificationId);
    });

    // 알림 닫기 처리
    chrome.notifications.onClosed.addListener((notificationId) => {
      const callbacks = this.activeNotifications.get(notificationId);
      if (callbacks) {
        callbacks.onCancel(); // 닫기는 취소로 처리
        this.clearNotification(notificationId);
      }
    });
  }

  /**
   * 폼 저장 확인 알림 표시
   */
  async showSaveConfirm(
    fieldCount: number,
    siteName: string,
    onSave: () => void,
    onCancel: () => void,
    onNever: () => void
  ): Promise<void> {
    const notificationId = `save-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 콜백 저장
    this.activeNotifications.set(notificationId, {
      onSave,
      onCancel,
      onNever
    });

    try {
      await chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        title: '💾 Form-ation: 폼 저장 확인',
        message: `${siteName}에서 ${fieldCount}개 필드를 저장하시겠습니까?`,
        buttons: [
          { title: '💾 저장' },
          { title: '❌ 이번에는 안함' },
          { title: '🚫 다시 묻지 않음' }
        ],
        requireInteraction: true, // 사용자가 직접 처리할 때까지 유지
        priority: 1 // 높은 우선순위
      });

      console.log('[BrowserNotification] 저장 확인 알림 표시:', notificationId);
    } catch (error) {
      console.error('[BrowserNotification] 알림 생성 실패:', error);
      // 알림 실패 시 fallback으로 즉시 취소 처리
      onCancel();
      this.clearNotification(notificationId);
    }
  }

  /**
   * 자동입력 확인 알림 표시
   */
  async showAutofillConfirm(
    _fieldCount: number, // fieldCount를 사용하지 않으므로 _로 표시
    siteName: string,
    previewFields: string[],
    onFill: () => void,
    onCancel: () => void,
    onNever: () => void
  ): Promise<void> {
    const notificationId = `autofill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.activeNotifications.set(notificationId, {
      onSave: onFill, // 자동입력에서는 onSave가 onFill 역할
      onCancel,
      onNever
    });

    const previewText = previewFields.slice(0, 2).join(', ');
    const extraCount = Math.max(0, previewFields.length - 2);
    const previewMessage = extraCount > 0 
      ? `${previewText} 외 ${extraCount}개`
      : previewText;

    try {
      await chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        title: '🔄 Form-ation: 자동입력 확인',
        message: `${siteName}에서 저장된 데이터로 자동입력하시겠습니까?\n미리보기: ${previewMessage}`,
        buttons: [
          { title: '🔄 자동입력' },
          { title: '❌ 이번에는 안함' },
          { title: '🚫 다시 묻지 않음' }
        ],
        requireInteraction: true,
        priority: 1
      });

      console.log('[BrowserNotification] 자동입력 확인 알림 표시:', notificationId);
    } catch (error) {
      console.error('[BrowserNotification] 알림 생성 실패:', error);
      onCancel();
      this.clearNotification(notificationId);
    }
  }

  private clearNotification(notificationId: string) {
    this.activeNotifications.delete(notificationId);
    chrome.notifications.clear(notificationId);
  }

  /**
   * 모든 활성 알림 정리
   */
  clearAllNotifications() {
    for (const notificationId of this.activeNotifications.keys()) {
      this.clearNotification(notificationId);
    }
  }

  /**
   * 간단한 정보 토스트 (버튼 없는 알림)
   */
  async showInfoToast(title: string, message: string) {
    const notificationId = `info-${Date.now()}`;
    
    try {
      await chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        title,
        message,
        requireInteraction: false // 자동으로 사라짐
      });

      // 3초 후 자동 삭제
      setTimeout(() => {
        chrome.notifications.clear(notificationId);
      }, 3000);
    } catch (error) {
      console.error('[BrowserNotification] 토스트 알림 실패:', error);
    }
  }
}

// 싱글톤 인스턴스
export const browserNotificationManager = new BrowserNotificationManager();
