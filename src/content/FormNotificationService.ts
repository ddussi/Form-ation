import { toastManager } from '../utils/toastManager';
import { notificationBridge } from '../utils/notificationBridge';
import type { StorageKey } from '../types/form';

export type SaveConfirmationResult = 'save' | 'skip' | 'never';
export type AutofillConfirmationResult = 'autofill' | 'skip' | 'never';

export class FormNotificationService {
  public notifySaveModeChanged(isEnabled: boolean): void {
    toastManager.info(`💾 저장 모드 ${isEnabled ? '활성화됨' : '비활성화됨'}`, 2000);
  }

  public notifySaveSuccess(fieldCount: number): void {
    toastManager.success(`폼 데이터 저장됨 (${fieldCount}개 필드)`);
  }

  public notifySaveError(): void {
    toastManager.error('폼 데이터 저장 실패');
  }

  public notifyAutofillSuccess(filledCount: number): void {
    toastManager.success(`자동입력 완료 (${filledCount}개 필드)`);
  }

  public notifyAutofillNoFields(): void {
    toastManager.info('자동입력 할 필드가 없었습니다');
  }

  public notifyAutofillError(): void {
    toastManager.error('자동입력 실패');
  }

  public notifySelectorModeAlreadyActive(): void {
    toastManager.warning('📝 필드 기억 모드가 이미 활성화되어 있습니다', 2000);
  }

  public notifySelectorModeActivated(): void {
    toastManager.info('📝 필드 기억 모드가 활성화되었습니다', 2000);
  }

  public notifySelectorModeAlreadyInactive(): void {
    toastManager.warning('📝 필드 기억 모드가 활성화되어 있지 않습니다', 2000);
  }

  public notifySelectorModeDeactivated(): void {
    toastManager.info('📝 필드 기억 모드가 비활성화되었습니다', 2000);
  }

  public notifySelectorModeSaveComplete(): void {
    toastManager.success('💾 필드 데이터가 저장되었습니다', 3000);
  }

  public notifyFieldMemoryTitleRequired(): void {
    toastManager.warning('❌ 제목이 입력되지 않아 저장이 취소되었습니다', 3000);
  }

  public notifyFieldMemorySaveSuccess(title: string): void {
    toastManager.success(`💾 "${title}" 데이터가 저장되었습니다`, 3000);
  }

  public notifyFieldMemorySaveError(): void {
    toastManager.error('❌ 데이터 저장에 실패했습니다', 3000);
  }

  public notifyAutoFillSuggestionSuccess(filledCount: number): void {
    toastManager.success(`✅ ${filledCount}개 필드 자동 입력 완료`, 3000);
  }

  public notifyAutoFillSuggestionError(): void {
    toastManager.error('❌ 자동 입력에 실패했습니다', 3000);
  }

  public async showSaveConfirmation(
    fieldCount: number,
    siteName: string,
    payload: {
      storageKey: StorageKey;
      values: Record<string, string>;
      origin: string;
      formSignature: string;
    }
  ): Promise<SaveConfirmationResult> {
    return new Promise<SaveConfirmationResult>((resolve) => {
      notificationBridge.showSaveConfirm(
        fieldCount,
        siteName,
        payload,
        () => resolve('save'),
        () => resolve('skip'),
        () => resolve('never')
      );
    });
  }

  public async showAutofillConfirmation(
    fieldCount: number,
    siteName: string,
    previewFields: string[]
  ): Promise<AutofillConfirmationResult> {
    return new Promise<AutofillConfirmationResult>((resolve) => {
      notificationBridge.showAutofillConfirm(
        fieldCount,
        siteName,
        previewFields,
        () => resolve('autofill'),
        () => resolve('skip'),
        () => resolve('never')
      );
    });
  }
}
