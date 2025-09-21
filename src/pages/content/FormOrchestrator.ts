/**
 * Form Orchestrator: 폼 관련 모든 서비스들을 조율하는 메인 클래스
 * 기존 FormManager의 책임을 적절히 분산시킨 후 조율만 담당
 */

import { FormDetectionService } from './services/FormDetectionService';
import { AutofillService } from './services/AutofillService';
import { SaveService } from './services/SaveService';
import { FieldMemoryService } from './services/FieldMemoryService';
import { MessageHandler } from './handlers/MessageHandler';
import { toastManager } from '../../ui/toast';

export class FormOrchestrator {
  private formDetectionService: FormDetectionService;
  private autofillService: AutofillService;
  private saveService: SaveService;
  private fieldMemoryService: FieldMemoryService;
  private messageHandler: MessageHandler;
  private isInitialized = false;

  constructor() {
    // 서비스들 초기화
    this.formDetectionService = new FormDetectionService();
    this.autofillService = new AutofillService();
    this.saveService = new SaveService();
    this.fieldMemoryService = new FieldMemoryService();
    this.messageHandler = new MessageHandler(this);
    
    this.init();
  }

  private init() {
    // DOM이 완전히 로드된 후 실행
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  private async initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log('[FormOrchestrator] 초기화 시작...');
    
    try {
      // 1. 메시지 핸들러 설정
      this.messageHandler.setup();
      
      // 2. 폼 감지 및 설정
      const detectedForms = await this.formDetectionService.detectForms();
      console.log(`[FormOrchestrator] ${detectedForms.length}개 폼 감지됨`);
      
      // 3. 폼별 이벤트 리스너 설정
      this.setupFormListeners(detectedForms);
      
      // 4. 자동입력 체크 (약간의 딜레이 후)
      setTimeout(() => {
        this.checkForAutofill(detectedForms);
        this.fieldMemoryService.checkFieldMemoryAutoFill();
      }, 500);
      
      console.log('[FormOrchestrator] 초기화 완료');
    } catch (error) {
      console.error('[FormOrchestrator] 초기화 실패:', error);
    }
  }

  private setupFormListeners(forms: any[]) {
    forms.forEach(form => {
      // 폼 제출 감지
      if (form.formElement) {
        form.formElement.addEventListener('submit', () => {
          this.handleFormSubmit(form);
        });
      }
    });

    // 페이지 이탈 시 처리
    window.addEventListener('beforeunload', () => {
      forms.forEach(form => {
        if (!form.formElement) {
          this.handleFormSubmit(form);
        }
      });
    });
  }

  private async handleFormSubmit(form: any) {
    console.log('[FormOrchestrator] 폼 제출 감지:', form.signature);
    await this.saveService.checkForSave(form);
  }

  private async checkForAutofill(forms: any[]) {
    console.log('[FormOrchestrator] 자동입력 체크 시작...');
    
    for (const form of forms) {
      try {
        await this.autofillService.checkForAutofill(form);
      } catch (error) {
        console.error('[FormOrchestrator] 자동입력 체크 에러:', error);
      }
    }
  }

  /**
   * 메시지 핸들러에서 호출되는 메소드들
   */
  async handleSaveModeChanged(isEnabled: boolean) {
    if (isEnabled) {
      toastManager.info('💾 저장 모드 활성화됨', 2000);
    } else {
      toastManager.info('💾 저장 모드 비활성화됨', 2000);
    }
  }

  activateSelectorMode() {
    this.fieldMemoryService.activateSelectorMode();
  }

  deactivateSelectorMode() {
    this.fieldMemoryService.deactivateSelectorMode();
  }

  /**
   * 디버깅용 메소드들
   */
  getDetectedForms() {
    return this.formDetectionService.getDetectedForms();
  }

  async manualSaveTest() {
    const forms = this.formDetectionService.getDetectedForms();
    for (const form of forms) {
      await this.saveService.manualSaveTest(form);
      break; // 첫 번째 폼만 테스트
    }
  }

  async manualAutofillTest() {
    const forms = this.formDetectionService.getDetectedForms();
    for (const form of forms) {
      await this.autofillService.manualAutofillTest(form);
      break; // 첫 번째 폼만 테스트
    }
  }

  destroy() {
    this.fieldMemoryService.destroy();
    this.messageHandler.cleanup();
  }
}
