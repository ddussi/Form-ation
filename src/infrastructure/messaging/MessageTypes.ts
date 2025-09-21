/**
 * Chrome Extension 메시지 타입 정의
 */

export interface BaseMessage {
  type: string;
  requestId?: string;
}

export interface SaveNotificationRequest extends BaseMessage {
  type: 'SHOW_SAVE_NOTIFICATION';
  fieldCount: number;
  siteName: string;
  formData: {
    storageKey: any;
    values: Record<string, string>;
    origin: string;
    formSignature: string;
  };
}

export interface AutofillNotificationRequest extends BaseMessage {
  type: 'SHOW_AUTOFILL_NOTIFICATION';
  fieldCount: number;
  siteName: string;
  previewFields: string[];
}

export interface NotificationResponse extends BaseMessage {
  type: 'SAVE_NOTIFICATION_RESPONSE' | 'AUTOFILL_NOTIFICATION_RESPONSE';
  action: 'save' | 'cancel' | 'never' | 'fill';
}

export interface SaveModeChangedMessage extends BaseMessage {
  type: 'SAVE_MODE_CHANGED';
  isEnabled: boolean;
}

export interface SelectorModeMessage extends BaseMessage {
  type: 'ACTIVATE_SELECTOR_MODE' | 'DEACTIVATE_SELECTOR_MODE';
}

export type ChromeMessage = 
  | SaveNotificationRequest
  | AutofillNotificationRequest
  | NotificationResponse
  | SaveModeChangedMessage
  | SelectorModeMessage;
