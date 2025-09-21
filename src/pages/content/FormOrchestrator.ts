/**
 * Form Orchestrator: 간단한 MVP + 셀렉터 모드 관리
 */

import { FieldMemoryService } from './services/FieldMemoryService';
import { MessageHandler } from './handlers/MessageHandler';
import { 
  getSimpleFormInfo, 
  collectFieldValues, 
  generateStorageKey, 
  storageKeyToString,
  saveFormData,
  getFormData,
  getGlobalSaveMode,
  setGlobalSaveMode
} from '../../utils';
import { showSaveConfirmNotification, showToast } from '../../utils/simpleNotification';

export class FormOrchestrator {
  private fieldMemoryService: FieldMemoryService;
  private messageHandler: MessageHandler;
  private isInitialized = false;
  private formCheckInterval: number | null = null;

  constructor() {
    // 서비스들 초기화 (셀렉터 모드만)
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

    console.log('[FormOrchestrator] 초기화 시작 (Simple MVP + Selector Mode)');
    
    try {
      // 1. 메시지 핸들러 설정
      this.messageHandler.setup();
      
      // 2. 간단한 폼 감지
      this.setupSimpleFormListeners();
      
      // 3. 간단한 자동입력 체크
      setTimeout(() => {
        this.checkForSimpleAutofill();
      }, 500);
      
      console.log('[FormOrchestrator] 초기화 완료');
    } catch (error) {
      console.error('[FormOrchestrator] 초기화 실패:', error);
    }
  }

  /**
   * 간단한 폼 리스너 설정
   */
  private setupSimpleFormListeners() {
    // form 태그 제출 감지
    document.addEventListener('submit', (event) => {
      if (event.target instanceof HTMLFormElement) {
        this.handleFormSubmit();
      }
    });

    // 페이지 이탈 시 감지 (form 태그가 없는 경우)
    window.addEventListener('beforeunload', () => {
      this.handleFormSubmit();
    });

    console.log('[FormOrchestrator] 간단한 폼 리스너 설정 완료');
  }

  /**
   * 폼 제출 처리
   */
  private async handleFormSubmit() {
    try {
      // 저장 모드가 ON인지 확인
      const saveMode = await getGlobalSaveMode();
      if (!saveMode.isEnabled) {
        console.log('[FormOrchestrator] 저장 모드 OFF - 저장 생략');
        return;
      }

      // 현재 페이지의 폼 정보 수집
      const formInfo = getSimpleFormInfo();
      if (formInfo.fields.length === 0) {
        console.log('[FormOrchestrator] 저장할 필드가 없음');
        return;
      }

      const values = collectFieldValues(formInfo.fields);
      if (Object.keys(values).length === 0) {
        console.log('[FormOrchestrator] 입력된 값이 없음');
        return;
      }

      const storageKey = generateStorageKey(formInfo.url, formInfo.signature);
      const siteName = new URL(formInfo.url).hostname;

      console.log('[FormOrchestrator] 저장 가능한 데이터 발견:', {
        fields: Object.keys(values).length,
        siteName
      });

      // 브라우저 알림으로 저장 확인
      showSaveConfirmNotification(
        Object.keys(values).length,
        siteName,
        {
          onSave: async () => {
            try {
              await saveFormData(storageKey, values);
              showToast('폼 데이터가 저장되었습니다', 'success');
              
              // 저장 후 자동으로 저장 모드 OFF
              await setGlobalSaveMode(false);
              console.log('[FormOrchestrator] 저장 완료 후 자동 OFF');
            } catch (error) {
              console.error('[FormOrchestrator] 저장 실패:', error);
              showToast('저장에 실패했습니다', 'error');
            }
          },
          onCancel: () => {
            console.log('[FormOrchestrator] 저장 취소');
          },
          onNever: () => {
            console.log('[FormOrchestrator] 다시 묻지 않음');
            // TODO: 사이트별 설정 저장
          }
        }
      );

    } catch (error) {
      console.error('[FormOrchestrator] 폼 제출 처리 실패:', error);
    }
  }

  /**
   * 간단한 자동입력 체크
   */
  private async checkForSimpleAutofill() {
    try {
      const formInfo = getSimpleFormInfo();
      if (formInfo.fields.length === 0) {
        return;
      }

      const storageKey = generateStorageKey(formInfo.url, formInfo.signature);
      const storedData = await getFormData(storageKey);

      if (storedData && Object.keys(storedData.fields).length > 0) {
        console.log('[FormOrchestrator] 저장된 데이터 발견:', storedData);
        
        // 간단한 자동입력: 매칭되는 필드에 값 입력
        let filledCount = 0;
        
        formInfo.fields.forEach(field => {
          if (storedData.fields[field.name] && !field.element.value) {
            field.element.value = storedData.fields[field.name];
            filledCount++;
          }
        });

        if (filledCount > 0) {
          showToast(`${filledCount}개 필드가 자동입력되었습니다`, 'success');
        }
      }

    } catch (error) {
      console.error('[FormOrchestrator] 자동입력 체크 실패:', error);
    }
  }

  /**
   * 메시지 핸들러에서 호출되는 메소드들
   */
  async handleSaveModeChanged(isEnabled: boolean) {
    if (isEnabled) {
      showToast('💾 저장 모드 활성화됨', 'info');
    } else {
      showToast('💾 저장 모드 비활성화됨', 'info');
    }
  }

  activateSelectorMode() {
    console.log('[FormOrchestrator] 셀렉터 모드 활성화');
    this.fieldMemoryService.activateSelectorMode();
  }

  deactivateSelectorMode() {
    console.log('[FormOrchestrator] 셀렉터 모드 비활성화');
    this.fieldMemoryService.deactivateSelectorMode();
  }

  /**
   * 디버깅용 메소드들
   */
  getFormInfo() {
    return getSimpleFormInfo();
  }

  async getStorageDebugInfo() {
    const formInfo = getSimpleFormInfo();
    if (formInfo.fields.length > 0) {
      const storageKey = generateStorageKey(formInfo.url, formInfo.signature);
      const storedData = await getFormData(storageKey);
      
      console.log('[FormOrchestrator] 디버그 정보:', {
        currentForm: formInfo,
        storageKey: storageKeyToString(storageKey),
        storedData
      });
    }
  }

  destroy() {
    this.fieldMemoryService.destroy();
    
    if (this.formCheckInterval) {
      clearInterval(this.formCheckInterval);
    }
    
    console.log('[FormOrchestrator] 정리 완료');
  }
}