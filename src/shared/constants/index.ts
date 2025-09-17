// 공통 상수 정의

export const EXTENSION_ID = 'formation-extension';
export const STORAGE_VERSION = 1;

export const NOTIFICATION_DURATION = {
  SUCCESS: 3000,
  INFO: 2000,
  WARNING: 3000,
  ERROR: 4000,
} as const;

export const CSS_CLASS_NAMES = {
  SELECTABLE_FIELD: 'formation-selectable-field',
  SELECTED_FIELD: 'formation-selected-field',
  MODAL_OVERLAY: 'formation-modal-overlay',
  TOAST_CONTAINER: 'formation-toast-container',
} as const;
