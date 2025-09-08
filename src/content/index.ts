import { detectForms, generateStorageKey, storageKeyToString, collectFieldValues } from '../utils/formDetection.js';
import { saveFormData, getSiteSettings, saveSiteSettings } from '../utils/storage.js';
import { ModalManager } from './ModalManager.js';
import type { FormInfo } from '../types/form.js';

class FormManager {
  private detectedForms: FormInfo[] = [];
  private isInitialized = false;
  private modalManager: ModalManager;
  private pendingSaves = new Map<string, { form: FormInfo; values: Record<string, string> }>();

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
    this.detectAndSetupForms();
  }

  private detectAndSetupForms() {
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
    
    const key = generateStorageKey(form);
    const storageKey = storageKeyToString(key);
    
    console.log('[FormManager] 저장 가능한 값 감지:', {
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
        // 모달 표시
        this.showSaveConfirmModal(form, values);
        break;
    }
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
      
      // TODO: 토스트 알림 표시 (5단계에서 구현)
      
    } catch (error) {
      console.error('[FormManager] 저장 실패:', error);
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
    import('../utils/storage.js').then(async ({ getAllStoredData }) => {
      const data = await getAllStoredData();
      console.log('[FormManager] 저장된 모든 데이터:', data);
    });
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
