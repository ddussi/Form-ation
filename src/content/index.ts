import { detectForms, generateStorageKey, storageKeyToString, collectFieldValues } from '../utils/formDetection';
import { saveFormData, getSiteSettings, saveSiteSettings, getFormData, getGlobalSaveMode, setGlobalSaveMode } from '../utils/storage';
import { matchFieldsForAutofill, generatePreviewData, executeAutofill } from '../utils/autofill';
import { toastManager } from '../utils/toastManager';
import { notificationBridge } from '../utils/notificationBridge';
import { ModalManager } from './ModalManager';
import type { FormInfo } from '../types/form';

class FormManager {
  private detectedForms: FormInfo[] = [];
  private isInitialized = false;
  private modalManager: ModalManager;
  private pendingSaves = new Map<string, { form: FormInfo; values: Record<string, string> }>();
  private autofillQueue: Array<{ form: FormInfo; storedData: any; previewData: Record<string, string> }> = [];
  private isProcessingAutofill = false;

  constructor() {
    this.modalManager = new ModalManager();
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

  private initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log('[FormManager] 초기화 시작...');
    this.setupMessageListener();
    this.detectAndSetupForms();
  }

  private setupMessageListener() {
    // Background script에서 보내는 메시지 처리
    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === 'SAVE_MODE_CHANGED') {
        console.log('[FormManager] 저장 모드 변경됨:', message.isEnabled ? 'ON' : 'OFF');
        
        // 저장 모드가 변경되었을 때 필요한 처리
        if (message.isEnabled) {
          toastManager.info('💾 저장 모드 활성화됨', 2000);
        } else {
          toastManager.info('💾 저장 모드 비활성화됨', 2000);
        }
      }
    });
  }

  private async detectAndSetupForms() {
    // 폼 감지
    this.detectedForms = detectForms();
    
    console.log(`[FormManager] ${this.detectedForms.length}개 폼 감지됨:`);
    this.detectedForms.forEach((form, index) => {
      const key = generateStorageKey(form);
      const storageKey = storageKeyToString(key);
      
      console.log(`  폼 ${index + 1}:`, {
        formElement: form.formElement ? 'form 태그' : '페이지 전체',
        fieldCount: form.fields.length,
        signature: form.signature,
        storageKey,
        fields: form.fields.map(f => ({ name: f.name, type: f.type }))
      });
    });

    // 각 폼에 대해 이벤트 리스너 설정
    this.detectedForms.forEach(form => this.setupFormListeners(form));
    
    // 페이지 이탈 시 처리를 위한 리스너 설정
    this.setupPageUnloadListener();

    // 자동입력 체크 (약간의 딜레이를 두고 실행)
    setTimeout(() => {
      this.checkForAutofill();
    }, 100);
  }

  private setupFormListeners(form: FormInfo) {
    // 폼 제출 감지 (form 태그가 있는 경우)
    if (form.formElement) {
      form.formElement.addEventListener('submit', () => {
        // 제출 전에 저장 확인
        this.onFormSubmit(form);
      });
    }
  }

  private setupPageUnloadListener() {
    // 페이지 이탈 시 폼 태그가 없는 폼들 체크
    window.addEventListener('beforeunload', () => {
      this.detectedForms.forEach(form => {
        // 폼 태그가 없는 경우만 체크 (폴백 처리)
        if (!form.formElement) {
          const values = collectFieldValues(form.fields);
          if (Object.keys(values).length > 0) {
            // beforeunload에서는 모달을 띄울 수 없으므로 자동 저장
            this.performSaveIfAllowed(form, values);
          }
        }
      });
    });
  }

  private async performSaveIfAllowed(form: FormInfo, values: Record<string, string>) {
    const key = generateStorageKey(form);
    const settings = await getSiteSettings(key.origin, key.formSignature);
    
    if (settings.saveMode === 'always') {
      await this.performSave(form, values);
    }
    // ask나 never는 페이지 이탈 시점에서는 처리하지 않음
  }

  private onFormSubmit(form: FormInfo) {
    console.log('[FormManager] 폼 제출 감지:', form.signature);
    this.checkForSave(form);
  }

  private async checkForSave(form: FormInfo) {
    const values = collectFieldValues(form.fields);
    const hasValues = Object.keys(values).length > 0;
    
    if (!hasValues) return;
    
    // 글로벌 저장 모드 확인 - OFF면 저장 안함
    const globalSaveMode = await getGlobalSaveMode();
    if (!globalSaveMode.isEnabled) {
      console.log('[FormManager] 저장 모드 OFF - 저장 생략');
      return;
    }
    
    const key = generateStorageKey(form);
    const storageKey = storageKeyToString(key);
    
    console.log('[FormManager] 저장 가능한 값 감지 (저장 모드 ON):', {
      storageKey,
      values
    });
    
    // 사이트 설정 확인
    const settings = await getSiteSettings(key.origin, key.formSignature);
    
    // 중복 모달 방지
    if (this.pendingSaves.has(storageKey)) {
      console.log('[FormManager] 이미 저장 모달이 표시 중:', storageKey);
      return;
    }
    
    switch (settings.saveMode) {
      case 'always':
        // 바로 저장
        await this.performSave(form, values);
        break;
        
      case 'never':
        // 저장하지 않음
        console.log('[FormManager] 저장 안 함 (사용자 설정):', storageKey);
        break;
        
      case 'ask':
      default:
        // 🎉 브라우저 알림으로 변경 (페이지 이동과 독립적)
        await this.showSaveConfirmNotification(form, values);
        break;
    }
  }

  private async showSaveConfirmNotification(form: FormInfo, values: Record<string, string>) {
    const key = generateStorageKey(form);
    const storageKey = storageKeyToString(key);
    const siteName = new URL(key.origin).hostname;
    
    // 중복 모달 방지
    this.pendingSaves.set(storageKey, { form, values });
    
    await notificationBridge.showSaveConfirm(
      Object.keys(values).length,
      siteName,
      {
        storageKey: key,
        values,
        origin: key.origin,
        formSignature: key.formSignature
      },
      () => {
        // 저장 선택 (Background Script에서 이미 저장 완료)
        console.log('[FormManager] 저장 완료 (Background에서 처리됨)');
        this.pendingSaves.delete(storageKey);
        // 토스트 알림 표시
        const fieldCount = Object.keys(values).length;
        toastManager.success(`폼 데이터 저장됨 (${fieldCount}개 필드)`);
      },
      () => {
        // 이번에는 안함
        console.log('[FormManager] 사용자가 저장을 취소함');
        this.pendingSaves.delete(storageKey);
      },
      () => {
        // 다시 묻지 않음 (Background Script에서 이미 설정 완료)
        console.log('[FormManager] 다시 묻지 않음 설정 완료 (Background에서 처리됨)');
        this.pendingSaves.delete(storageKey);
      }
    );
  }

  private showSaveConfirmModal(form: FormInfo, values: Record<string, string>) {
    const key = generateStorageKey(form);
    const storageKey = storageKeyToString(key);
    
    // 중복 방지
    this.pendingSaves.set(storageKey, { form, values });
    
    this.modalManager.showSaveConfirm(
      form,
      // 저장 선택
      async () => {
        await this.performSave(form, values);
        this.pendingSaves.delete(storageKey);
      },
      // 이번만 아니오
      () => {
        console.log('[FormManager] 이번만 저장 안 함:', storageKey);
        this.pendingSaves.delete(storageKey);
      },
      // 다시 묻지 않기
      async () => {
        console.log('[FormManager] 다시 묻지 않기 설정:', storageKey);
        await saveSiteSettings(key.origin, key.formSignature, { saveMode: 'never' });
        this.pendingSaves.delete(storageKey);
      }
    );
  }

  private async performSave(form: FormInfo, values: Record<string, string>) {
    try {
      const key = generateStorageKey(form);
      await saveFormData(key, values);
      
      console.log('[FormManager] 폼 데이터 저장 완료:', {
        storageKey: storageKeyToString(key),
        fieldCount: Object.keys(values).length
      });
      
      // 저장 완료 토스트 표시
      const fieldCount = Object.keys(values).length;
      toastManager.success(`폼 데이터 저장됨 (${fieldCount}개 필드)`);
      
      // 저장 완료 후 자동으로 저장 모드 OFF
      await setGlobalSaveMode(false);
      
      // Background script에 상태 변경 알림
      chrome.runtime.sendMessage({
        type: 'UPDATE_ICON_STATE'
      }).catch(() => {
        // 에러 무시 (background script가 없을 수도 있음)
      });
      
      console.log('[FormManager] 저장 모드 자동 OFF 설정됨');
      
    } catch (error) {
      console.error('[FormManager] 저장 실패:', error);
      toastManager.error('폼 데이터 저장 실패');
    }
  }

  // 디버깅용 메소드들
  public getDetectedForms() {
    return this.detectedForms;
  }

  public manualCheck() {
    this.detectedForms.forEach(form => this.checkForSave(form));
  }

  public async manualSaveTest() {
    console.log('[FormManager] 수동 저장 테스트 실행...');
    for (const form of this.detectedForms) {
      const values = collectFieldValues(form.fields);
      if (Object.keys(values).length > 0) {
        this.showSaveConfirmModal(form, values);
        break; // 첫 번째 폼만 테스트
      }
    }
  }

  public getStorageDebugInfo() {
    import('../utils/storage').then(async ({ getAllStoredData }) => {
      const data = await getAllStoredData();
      console.log('[FormManager] 저장된 모든 데이터:', data);
    });
  }

  // 자동입력 관련 메소드들
  private async checkForAutofill() {
    console.log('[FormManager] 자동입력 체크 시작...');

    // 모든 폼을 검사해서 자동입력 대상을 큐에 추가
    for (const form of this.detectedForms) {
      try {
        const key = generateStorageKey(form);
        const storedData = await getFormData(key);
        
        if (storedData && Object.keys(storedData.fields).length > 0) {
          await this.queueAutofillIfNeeded(form, storedData);
        }
      } catch (error) {
        console.error('[FormManager] 자동입력 체크 에러:', error);
      }
    }

    // 큐에 있는 항목들을 순차 처리
    this.processAutofillQueue();
  }

  private async queueAutofillIfNeeded(form: FormInfo, storedData: any) {
    const key = generateStorageKey(form);
    const settings = await getSiteSettings(key.origin, key.formSignature);
    
    // 매칭 가능한 필드 확인
    const matches = matchFieldsForAutofill(form, storedData);
    const previewData = generatePreviewData(matches);
    
    if (Object.keys(previewData).length === 0) {
      console.log('[FormManager] 자동입력 가능한 필드 없음:', key.formSignature);
      return;
    }

    const storageKey = storageKeyToString(key);
    console.log('[FormManager] 자동입력 가능한 데이터 발견:', {
      storageKey,
      matchCount: matches.length,
      autofillableCount: Object.keys(previewData).length
    });

    switch (settings.autofillMode) {
      case 'always':
        // 바로 자동입력 (큐 거치지 않음)
        await this.performAutofill(form, storedData);
        break;
        
      case 'never':
        // 자동입력하지 않음
        console.log('[FormManager] 자동입력 안 함 (사용자 설정):', storageKey);
        break;
        
      case 'ask':
      default:
        // 큐에 추가
        this.autofillQueue.push({ form, storedData, previewData });
        break;
    }
  }

  private async processAutofillQueue() {
    if (this.isProcessingAutofill || this.autofillQueue.length === 0) {
      return;
    }

    this.isProcessingAutofill = true;
    
    while (this.autofillQueue.length > 0) {
      const { form, storedData, previewData } = this.autofillQueue.shift()!;
      
      console.log(`[FormManager] 자동입력 큐 처리 중... (남은 폼: ${this.autofillQueue.length}개)`);
      
      // 사용자 응답을 기다림
      await this.showAutofillConfirmModalAndWait(form, storedData, previewData);
    }

    this.isProcessingAutofill = false;
    console.log('[FormManager] 모든 자동입력 큐 처리 완료');
  }

  private showAutofillConfirmModalAndWait(
    form: FormInfo, 
    storedData: any, 
    previewData: Record<string, string>
  ): Promise<void> {
    return new Promise(async (resolve) => {
      const key = generateStorageKey(form);
      
      // 🎉 브라우저 알림으로 변경 (페이지 이동과 독립적)
      const siteName = new URL(key.origin).hostname;
      const previewFields = Object.keys(previewData);
      
      await notificationBridge.showAutofillConfirm(
        Object.keys(previewData).length,
        siteName,
        previewFields,
        // 자동입력 선택
        async () => {
          await this.performAutofill(form, storedData);
          resolve();
        },
        // 이번만 아니오
        () => {
          console.log('[FormManager] 이번만 자동입력 안 함:', storageKeyToString(key));
          resolve();
        },
        // 다시 묻지 않기
        async () => {
          console.log('[FormManager] 자동입력 다시 묻지 않기 설정:', storageKeyToString(key));
          await saveSiteSettings(key.origin, key.formSignature, { autofillMode: 'never' });
          resolve();
        }
      );
    });
  }


  private async performAutofill(form: FormInfo, storedData: any) {
    try {
      const result = executeAutofill(form, storedData);
      const key = generateStorageKey(form);
      
      console.log('[FormManager] 자동입력 완료:', {
        storageKey: storageKeyToString(key),
        ...result
      });
      
      // 자동입력 완료 토스트 표시
      if (result.filledCount > 0) {
        toastManager.success(`자동입력 완료 (${result.filledCount}개 필드)`);
      } else {
        toastManager.info('자동입력 할 필드가 없었습니다');
      }
      
    } catch (error) {
      console.error('[FormManager] 자동입력 실패:', error);
      toastManager.error('자동입력 실패');
    }
  }

  // 디버깅용 자동입력 테스트
  public async manualAutofillTest() {
    console.log('[FormManager] 수동 자동입력 테스트 실행...');
    for (const form of this.detectedForms) {
      const key = generateStorageKey(form);
      const storedData = await getFormData(key);
      
      if (storedData) {
        const matches = matchFieldsForAutofill(form, storedData);
        const previewData = generatePreviewData(matches);
        
        if (Object.keys(previewData).length > 0) {
          await this.showAutofillConfirmModalAndWait(form, storedData, previewData);
          break; // 첫 번째 폼만 테스트
        }
      }
    }
  }

  public destroy() {
    this.modalManager.destroy();
  }
}

// FormManager 인스턴스 생성
const formManager = new FormManager();

// 디버깅을 위해 전역에 노출
(window as any).formManager = formManager;

console.log('[content] Form-ation 콘텐트 스크립트 로드됨');
