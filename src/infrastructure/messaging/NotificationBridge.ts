// Content Script에서 Background Script로 알림 요청하는 브릿지

import type { ChromeMessage, NotificationResponse } from './MessageTypes';

export class NotificationBridge {
  private pendingRequests = new Map<string, {
    resolve: (action: string) => void;
    reject: (error: Error) => void;
  }>();

  constructor() {
    this.setupMessageListener();
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message: ChromeMessage) => {
      console.log('[NotificationBridge] 응답 받음:', message);
      
      if (message.type === 'SAVE_NOTIFICATION_RESPONSE' || message.type === 'AUTOFILL_NOTIFICATION_RESPONSE') {
        const notificationResponse = message as NotificationResponse;
        const pending = this.pendingRequests.get(notificationResponse.requestId || '');
        
        if (pending) {
          console.log('[NotificationBridge] 요청 해결:', notificationResponse.requestId, notificationResponse.action);
          pending.resolve(notificationResponse.action);
          this.pendingRequests.delete(notificationResponse.requestId || '');
        } else {
          console.warn('[NotificationBridge] 대기 중인 요청 없음:', notificationResponse.requestId);
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
    formData: { storageKey: any; values: Record<string, string>; origin: string; formSignature: string },
    onSave: () => void,
    onCancel: () => void,
    onNever: () => void
  ): Promise<void> {
    const requestId = `save-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('[NotificationBridge] 저장 알림 요청:', { requestId, fieldCount, siteName, formData });

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });

      // Background script에 알림 요청 (폼 데이터 포함)
      chrome.runtime.sendMessage({
        type: 'SHOW_SAVE_NOTIFICATION',
        fieldCount,
        siteName,
        formData, // 🔑 저장할 데이터 포함
        requestId
      }, (response: any) => {
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
