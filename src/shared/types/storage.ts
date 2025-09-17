/**
 * 저장소 관련 공통 타입 정의
 */

export interface SiteSettings {
  saveMode: 'ask' | 'always' | 'never';
  autofillMode: 'ask' | 'always' | 'never';
}

export interface GlobalSaveMode {
  isEnabled: boolean;
}

export interface NotificationMessage {
  type: string;
  [key: string]: any;
}

export interface ChromeMessage {
  type: string;
  data?: any;
  requestId?: string;
}
