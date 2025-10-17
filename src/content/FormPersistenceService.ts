import { collectFieldValues, generateStorageKey, storageKeyToString } from '../utils/formDetection';
import { saveFormData, getSiteSettings, saveSiteSettings, getGlobalSaveMode, setGlobalSaveMode } from '../utils/storage';
import type { FormInfo } from '../types/form';
import { ModalManager } from './ModalManager';
import { FormNotificationService } from './FormNotificationService';

export class FormPersistenceService {
  private pendingSaves = new Map<string, { form: FormInfo; values: Record<string, string> }>();
  private readonly modalManager: ModalManager;
  private readonly notificationService: FormNotificationService;

  constructor(modalManager: ModalManager, notificationService: FormNotificationService) {
    this.modalManager = modalManager;
    this.notificationService = notificationService;
  }

  public async handleFormSubmit(form: FormInfo): Promise<void> {
    console.log('[FormPersistenceService] 폼 제출 감지:', form.signature);
    await this.checkForSave(form);
  }

  public async performSaveIfAllowed(form: FormInfo, values: Record<string, string>): Promise<void> {
    const key = generateStorageKey(form);
    const settings = await getSiteSettings(key.origin, key.formSignature);

    if (settings.saveMode === 'always') {
      await this.performSave(form, values);
    }
  }

  public async manualCheck(forms: FormInfo[]): Promise<void> {
    for (const form of forms) {
      await this.checkForSave(form);
    }
  }

  public async manualSaveTest(forms: FormInfo[]): Promise<void> {
    console.log('[FormPersistenceService] 수동 저장 테스트 실행...');
    for (const form of forms) {
      const values = collectFieldValues(form.fields);
      if (Object.keys(values).length > 0) {
        this.showSaveConfirmModal(form, values);
        break;
      }
    }
  }

  private async checkForSave(form: FormInfo): Promise<void> {
    const values = collectFieldValues(form.fields);
    if (Object.keys(values).length === 0) {
      return;
    }

    const globalSaveMode = await getGlobalSaveMode();
    if (!globalSaveMode.isEnabled) {
      console.log('[FormPersistenceService] 저장 모드 OFF - 저장 생략');
      return;
    }

    const key = generateStorageKey(form);
    const storageKey = storageKeyToString(key);

    console.log('[FormPersistenceService] 저장 가능한 값 감지:', { storageKey, values });

    const settings = await getSiteSettings(key.origin, key.formSignature);

    if (this.pendingSaves.has(storageKey)) {
      console.log('[FormPersistenceService] 이미 저장 대기 중:', storageKey);
      return;
    }

    switch (settings.saveMode) {
      case 'always':
        await this.performSave(form, values);
        break;
      case 'never':
        console.log('[FormPersistenceService] 사용자 설정으로 저장하지 않음:', storageKey);
        break;
      case 'ask':
      default:
        await this.queueSaveConfirmation(form, values);
        break;
    }
  }

  private async queueSaveConfirmation(
    form: FormInfo,
    values: Record<string, string>,
  ): Promise<void> {
    const key = generateStorageKey(form);
    const storageKey = storageKeyToString(key);
    const siteName = new URL(key.origin).hostname;
    this.pendingSaves.set(storageKey, { form, values });

    try {
      const result = await this.notificationService.showSaveConfirmation(
        Object.keys(values).length,
        siteName,
        {
          storageKey: key,
          values,
          origin: key.origin,
          formSignature: key.formSignature,
        }
      );

      switch (result) {
        case 'save':
          console.log('[FormPersistenceService] 저장 완료 (Background에서 처리됨)');
          this.notificationService.notifySaveSuccess(Object.keys(values).length);
          break;
        case 'never':
          console.log('[FormPersistenceService] 다시 묻지 않음 설정 완료:', storageKey);
          break;
        case 'skip':
        default:
          console.log('[FormPersistenceService] 저장 취소됨:', storageKey);
          break;
      }
    } finally {
      this.pendingSaves.delete(storageKey);
    }
  }

  private showSaveConfirmModal(form: FormInfo, values: Record<string, string>): void {
    const key = generateStorageKey(form);
    const storageKey = storageKeyToString(key);

    this.pendingSaves.set(storageKey, { form, values });

    this.modalManager.showSaveConfirm(
      form,
      async () => {
        await this.performSave(form, values);
        this.pendingSaves.delete(storageKey);
      },
      () => {
        this.pendingSaves.delete(storageKey);
        console.log('[FormPersistenceService] 이번만 저장 안 함:', storageKey);
      },
      async () => {
        await saveSiteSettings(key.origin, key.formSignature, { saveMode: 'never' });
        this.pendingSaves.delete(storageKey);
        console.log('[FormPersistenceService] 다시 묻지 않음 설정:', storageKey);
      }
    );
  }

  private async performSave(form: FormInfo, values: Record<string, string>): Promise<void> {
    try {
      const key = generateStorageKey(form);
      await saveFormData(key, values);

      console.log('[FormPersistenceService] 폼 데이터 저장 완료:', {
        storageKey: storageKeyToString(key),
        fieldCount: Object.keys(values).length,
      });

      this.notificationService.notifySaveSuccess(Object.keys(values).length);

      await setGlobalSaveMode(false);

      chrome.runtime.sendMessage({ type: 'UPDATE_ICON_STATE' }).catch(() => {
        // background script가 없을 수 있음
      });

      console.log('[FormPersistenceService] 저장 모드 자동 OFF 설정됨');
    } catch (error) {
      console.error('[FormPersistenceService] 저장 실패:', error);
      this.notificationService.notifySaveError();
    }
  }
}
