// Content Script에서 Background Script로 알림 요청하는 브릿지

export class NotificationBridge {
  private pendingRequests = new Map<string, {
    resolve: (action: string) => void;
    reject: (error: Error) => void;
  }>();

  constructor() {
    this.setupMessageListener();
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message: any) => {
      console.log('[NotificationBridge] 응답 받음:', message);
      
      if (message.type === 'SAVE_NOTIFICATION_RESPONSE' || message.type === 'AUTOFILL_NOTIFICATION_RESPONSE') {
        const pending = this.pendingRequests.get(message.requestId);
        if (pending) {
          console.log('[NotificationBridge] 요청 해결:', message.requestId, message.action);
          pending.resolve(message.action);
          this.pendingRequests.delete(message.requestId);
        } else {
          console.warn('[NotificationBridge] 대기 중인 요청 없음:', message.requestId);
        }
      }
    });
  }

  /**
   * 저장 확인 알림 표시
   */
  async showSaveConfirm(
    fieldCount: number,
    siteName: string,
    onSave: () => void,
    onCancel: () => void,
    onNever: () => void
  ): Promise<void> {
    const requestId = `save-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('[NotificationBridge] 저장 알림 요청:', { requestId, fieldCount, siteName });

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });

      // Background script에 알림 요청
      chrome.runtime.sendMessage({
        type: 'SHOW_SAVE_NOTIFICATION',
        fieldCount,
        siteName,
        requestId
      }, (response) => {
        console.log('[NotificationBridge] sendMessage 응답:', response);
        if (chrome.runtime.lastError) {
          console.error('[NotificationBridge] sendMessage 에러:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
        }
      });
    }).then((action: unknown) => {
      console.log('[NotificationBridge] 최종 액션:', action);
      switch (action) {
        case 'save':
          onSave();
          break;
        case 'cancel':
          onCancel();
          break;
        case 'never':
          onNever();
          break;
      }
    }).catch((error) => {
      console.error('[NotificationBridge] 저장 알림 에러:', error);
      onCancel(); // 에러 시 취소로 처리
    });
  }

  /**
   * 자동입력 확인 알림 표시
   */
  async showAutofillConfirm(
    _fieldCount: number, // fieldCount 사용 안 함 (미래 확장용)
    siteName: string,
    previewFields: string[],
    onFill: () => void,
    onCancel: () => void,
    onNever: () => void
  ): Promise<void> {
    const requestId = `autofill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });

      // Background script에 알림 요청
      chrome.runtime.sendMessage({
        type: 'SHOW_AUTOFILL_NOTIFICATION',
        fieldCount: previewFields.length,
        siteName,
        previewFields,
        requestId
      });
    }).then((action: unknown) => {
      switch (action) {
        case 'fill':
          onFill();
          break;
        case 'cancel':
          onCancel();
          break;
        case 'never':
          onNever();
          break;
      }
    }).catch((error) => {
      console.error('[NotificationBridge] 자동입력 알림 에러:', error);
      onCancel(); // 에러 시 취소로 처리
    });
  }

  /**
   * 정리 작업
   */
  destroy() {
    this.pendingRequests.clear();
  }
}

// 싱글톤 인스턴스
export const notificationBridge = new NotificationBridge();
