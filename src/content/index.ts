import { ModalManager } from './ModalManager';
import { SelectorMode } from './SelectorMode';
import { AutoFillSuggester } from './AutoFillSuggester';
import type { FormInfo } from '../types/form';
import { FormDetectionService } from './FormDetectionService';
import { FormPersistenceService } from './FormPersistenceService';
import { FormNotificationService } from './FormNotificationService';
import { FormInteractionController } from './FormInteractionController';

class FormManager {
  private isInitialized = false;
  private readonly modalManager: ModalManager;
  private readonly notificationService: FormNotificationService;
  private readonly persistenceService: FormPersistenceService;
  private readonly detectionService: FormDetectionService;
  private readonly interactionController: FormInteractionController;

  constructor() {
    this.modalManager = new ModalManager();
    this.notificationService = new FormNotificationService();
    this.persistenceService = new FormPersistenceService(this.modalManager, this.notificationService);
    this.interactionController = new FormInteractionController({
      notificationService: this.notificationService,
      selectorModeFactory: (callbacks) => new SelectorMode({}, callbacks),
      autoFillSuggesterFactory: (callbacks) => new AutoFillSuggester(callbacks),
    });
    this.detectionService = new FormDetectionService({
      onFormsDetected: (forms) => this.onFormsDetected(forms),
      onFormSubmit: (form) => { void this.persistenceService.handleFormSubmit(form); },
      onPageUnloadSave: (form, values) => { void this.persistenceService.performSaveIfAllowed(form, values); },
    });

    this.init();
  }

  private init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  private initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log('[FormManager] 초기화 시작...');
    this.setupMessageListener();

    this.detectionService.initialize();

    setTimeout(() => {
      void this.interactionController.checkForAutofill();
    }, 100);

    setTimeout(() => {
      void this.interactionController.checkFieldMemoryAutoFill();
    }, 500);
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message: unknown) => {
      if (typeof message !== 'object' || message === null) {
        return;
      }

      const typedMessage = message as { type?: string; isEnabled?: boolean };

      if (typedMessage.type === 'SAVE_MODE_CHANGED') {
        console.log('[FormManager] 저장 모드 변경됨:', typedMessage.isEnabled ? 'ON' : 'OFF');
        this.notificationService.notifySaveModeChanged(Boolean(typedMessage.isEnabled));
      } else if (typedMessage.type === 'ACTIVATE_SELECTOR_MODE') {
        console.log('[FormManager] 셀렉터 모드 활성화 요청');
        this.interactionController.activateSelectorMode();
      } else if (typedMessage.type === 'DEACTIVATE_SELECTOR_MODE') {
        console.log('[FormManager] 셀렉터 모드 비활성화 요청');
        this.interactionController.deactivateSelectorMode();
      }
    });
  }

  private onFormsDetected(forms: FormInfo[]) {
    this.interactionController.setForms(forms);
  }

  public getDetectedForms() {
    return this.detectionService.getForms();
  }

  public manualCheck() {
    void this.persistenceService.manualCheck(this.detectionService.getForms());
  }

  public manualSaveTest() {
    void this.persistenceService.manualSaveTest(this.detectionService.getForms());
  }

  public getStorageDebugInfo() {
    import('../utils/storage').then(async ({ getAllStoredData }) => {
      const data = await getAllStoredData();
      console.log('[FormManager] 저장된 모든 데이터:', data);
    });
  }

  public manualAutofillTest() {
    void this.interactionController.manualAutofillTest(this.detectionService.getForms());
  }

  public destroy() {
    this.modalManager.destroy();
    this.interactionController.destroy();
  }
}

declare global {
  interface Window {
    formManager: FormManager;
  }
}

const formManager = new FormManager();
window.formManager = formManager;

console.log('[content] Form-ation 콘텐트 스크립트 로드됨');
