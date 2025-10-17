import { generateStorageKey, storageKeyToString } from '../utils/formDetection';
import { getSiteSettings, saveSiteSettings, getFormData } from '../utils/storage';
import { matchFieldsForAutofill, generatePreviewData, executeAutofill } from '../utils/autofill';
import { saveFieldMemory, generateUrlPattern } from '../utils/fieldStorage';
import type { FormInfo, StoredFormData } from '../types/form';
import type { FieldData, FieldMemory } from '../types/fieldMemory';
import { SelectorMode, type SelectorModeCallbacks } from './SelectorMode';
import { AutoFillSuggester, type AutoFillSuggesterCallbacks } from './AutoFillSuggester';
import { FormNotificationService } from './FormNotificationService';

interface FormInteractionControllerDeps {
  notificationService: FormNotificationService;
  selectorModeFactory: (callbacks: SelectorModeCallbacks) => SelectorMode;
  autoFillSuggesterFactory: (callbacks: AutoFillSuggesterCallbacks) => AutoFillSuggester;
}

export class FormInteractionController {
  private forms: FormInfo[] = [];
  private autofillQueue: Array<{ form: FormInfo; storedData: StoredFormData; previewData: Record<string, string> }> = [];
  private isProcessingAutofill = false;
  private readonly selectorMode: SelectorMode;
  private readonly autoFillSuggester: AutoFillSuggester;
  private readonly deps: FormInteractionControllerDeps;

  constructor(deps: FormInteractionControllerDeps) {
    this.deps = deps;
    this.selectorMode = deps.selectorModeFactory(this.getSelectorModeCallbacks());
    this.autoFillSuggester = deps.autoFillSuggesterFactory(this.getAutoFillSuggesterCallbacks());
  }

  public setForms(forms: FormInfo[]): void {
    this.forms = forms;
  }

  public async checkForAutofill(): Promise<void> {
    console.log('[FormInteractionController] 자동입력 체크 시작...');

    for (const form of this.forms) {
      try {
        const key = generateStorageKey(form);
        const storedData = await getFormData(key);

        if (storedData && Object.keys(storedData.fields).length > 0) {
          await this.queueAutofillIfNeeded(form, storedData);
        }
      } catch (error) {
        console.error('[FormInteractionController] 자동입력 체크 에러:', error);
      }
    }

    void this.processAutofillQueue();
  }

  public async manualAutofillTest(forms: FormInfo[]): Promise<void> {
    console.log('[FormInteractionController] 수동 자동입력 테스트 실행...');
    for (const form of forms) {
      const key = generateStorageKey(form);
      const storedData = await getFormData(key);

      if (storedData) {
        const matches = matchFieldsForAutofill(form, storedData);
        const previewData = generatePreviewData(matches);

        if (Object.keys(previewData).length > 0) {
          await this.requestAutofillConfirmation(form, storedData, previewData);
          break;
        }
      }
    }
  }

  public async checkFieldMemoryAutoFill(): Promise<void> {
    try {
      await this.autoFillSuggester.checkForSavedData();
    } catch (error) {
      console.error('[FormInteractionController] 필드 메모리 자동 입력 체크 실패:', error);
    }
  }

  public activateSelectorMode(): void {
    if (this.selectorMode.isActivated()) {
      this.deps.notificationService.notifySelectorModeAlreadyActive();
      return;
    }

    this.selectorMode.activate();
    this.deps.notificationService.notifySelectorModeActivated();
  }

  public deactivateSelectorMode(): void {
    if (!this.selectorMode.isActivated()) {
      this.deps.notificationService.notifySelectorModeAlreadyInactive();
      return;
    }

    this.selectorMode.deactivate('cancel');
    this.deps.notificationService.notifySelectorModeDeactivated();
  }

  public destroy(): void {
    if (this.selectorMode.isActivated()) {
      this.selectorMode.deactivate('cancel');
    }
    this.autoFillSuggester.hideSuggestionModal();
  }

  private async queueAutofillIfNeeded(form: FormInfo, storedData: StoredFormData): Promise<void> {
    const key = generateStorageKey(form);
    const settings = await getSiteSettings(key.origin, key.formSignature);

    const matches = matchFieldsForAutofill(form, storedData);
    const previewData = generatePreviewData(matches);

    if (Object.keys(previewData).length === 0) {
      console.log('[FormInteractionController] 자동입력 가능한 필드 없음:', key.formSignature);
      return;
    }

    const storageKey = storageKeyToString(key);
    console.log('[FormInteractionController] 자동입력 가능한 데이터 발견:', {
      storageKey,
      matchCount: matches.length,
      autofillableCount: Object.keys(previewData).length,
    });

    switch (settings.autofillMode) {
      case 'always':
        await this.performAutofill(form, storedData);
        break;
      case 'never':
        console.log('[FormInteractionController] 자동입력 안 함 (사용자 설정):', storageKey);
        break;
      case 'ask':
      default:
        this.autofillQueue.push({ form, storedData, previewData });
        break;
    }
  }

  private async processAutofillQueue(): Promise<void> {
    if (this.isProcessingAutofill || this.autofillQueue.length === 0) {
      return;
    }

    this.isProcessingAutofill = true;

    while (this.autofillQueue.length > 0) {
      const { form, storedData, previewData } = this.autofillQueue.shift()!;
      console.log(`[FormInteractionController] 자동입력 큐 처리 중... (남은 폼: ${this.autofillQueue.length}개)`);
      await this.requestAutofillConfirmation(form, storedData, previewData);
    }

    this.isProcessingAutofill = false;
    console.log('[FormInteractionController] 모든 자동입력 큐 처리 완료');
  }

  private async requestAutofillConfirmation(
    form: FormInfo,
    storedData: StoredFormData,
    previewData: Record<string, string>,
  ): Promise<void> {
    const key = generateStorageKey(form);
    const siteName = new URL(key.origin).hostname;
    const previewFields = Object.keys(previewData);

    const result = await this.deps.notificationService.showAutofillConfirmation(
      previewFields.length,
      siteName,
      previewFields,
    );

    switch (result) {
      case 'autofill':
        await this.performAutofill(form, storedData);
        break;
      case 'never':
        await saveSiteSettings(key.origin, key.formSignature, { autofillMode: 'never' });
        break;
      case 'skip':
      default:
        console.log('[FormInteractionController] 이번만 자동입력 안 함:', storageKeyToString(key));
        break;
    }
  }

  private async performAutofill(form: FormInfo, storedData: StoredFormData): Promise<void> {
    try {
      const result = executeAutofill(form, storedData);
      const key = generateStorageKey(form);

      console.log('[FormInteractionController] 자동입력 완료:', {
        storageKey: storageKeyToString(key),
        ...result,
      });

      if (result.filledCount > 0) {
        this.deps.notificationService.notifyAutofillSuccess(result.filledCount);
      } else {
        this.deps.notificationService.notifyAutofillNoFields();
      }
    } catch (error) {
      console.error('[FormInteractionController] 자동입력 실패:', error);
      this.deps.notificationService.notifyAutofillError();
    }
  }

  private getSelectorModeCallbacks(): SelectorModeCallbacks {
    return {
      onSelectionComplete: (selectedFields: FieldData[]) => {
        void this.handleFieldSelectionComplete(selectedFields);
      },
      onModeExit: (reason) => {
        console.log('[FormInteractionController] 셀렉터 모드 종료:', reason);
        if (reason === 'save') {
          this.deps.notificationService.notifySelectorModeSaveComplete();
        }
      },
    };
  }

  private getAutoFillSuggesterCallbacks(): AutoFillSuggesterCallbacks {
    return {
      onSuggestionFound: (memories: FieldMemory[]) => {
        console.log('[FormInteractionController] 자동 입력 제안 발견:', memories.length);
      },
      onAutoFillComplete: (result) => {
        console.log('[FormInteractionController] 자동 입력 완료:', result);
        this.deps.notificationService.notifyAutoFillSuggestionSuccess(result.filledCount);
      },
      onAutoFillFailed: (error) => {
        console.error('[FormInteractionController] 자동 입력 실패:', error);
        this.deps.notificationService.notifyAutoFillSuggestionError();
      },
    };
  }

  private async handleFieldSelectionComplete(selectedFields: FieldData[]): Promise<void> {
    try {
      const currentUrl = window.location.href;
      const urlPattern = generateUrlPattern(currentUrl);
      const title = prompt(
        '저장할 데이터의 제목을 입력하세요',
        `${new URL(currentUrl).hostname} 폼 데이터`
      );

      if (!title) {
        this.deps.notificationService.notifyFieldMemoryTitleRequired();
        return;
      }

      const memoryId = await saveFieldMemory({
        url: currentUrl,
        urlPattern,
        title: title.trim(),
        fields: selectedFields,
        useCount: 0,
      });

      console.log('[FormInteractionController] 필드 메모리 저장 완료:', {
        id: memoryId,
        fieldCount: selectedFields.length,
        title,
      });

      this.deps.notificationService.notifyFieldMemorySaveSuccess(title);
    } catch (error) {
      console.error('[FormInteractionController] 필드 메모리 저장 실패:', error);
      this.deps.notificationService.notifyFieldMemorySaveError();
    }
  }
}
