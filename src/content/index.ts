import { detectForms, generateStorageKey, storageKeyToString, collectFieldValues } from '../utils/formDetection.js';
import type { FormInfo } from '../types/form.js';

class FormManager {
  private detectedForms: FormInfo[] = [];
  private isInitialized = false;

  constructor() {
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
  }

  private setupFormListeners(form: FormInfo) {
    // 필드 변경 감지를 위한 이벤트 리스너
    form.fields.forEach(field => {
      // input 이벤트로 실시간 변경 감지
      field.element.addEventListener('input', () => {
        this.onFieldChanged(form, field.element);
      });
      
      // focus out 시에도 체크
      field.element.addEventListener('blur', () => {
        this.onFieldChanged(form, field.element);
      });
    });

    // 폼 제출 감지 (form 태그가 있는 경우)
    if (form.formElement) {
      form.formElement.addEventListener('submit', () => {
        this.onFormSubmit(form);
      });
    }
  }

  private onFieldChanged(form: FormInfo, element: HTMLElement) {
    // 디바운스를 위해 타이머 사용 (0.5초 후)
    clearTimeout((element as any)._formationTimer);
    (element as any)._formationTimer = setTimeout(() => {
      this.checkForSave(form);
    }, 500);
  }

  private onFormSubmit(form: FormInfo) {
    console.log('[FormManager] 폼 제출 감지:', form.signature);
    this.checkForSave(form);
  }

  private checkForSave(form: FormInfo) {
    const values = collectFieldValues(form.fields);
    const hasValues = Object.keys(values).length > 0;
    
    if (hasValues) {
      const key = generateStorageKey(form);
      const storageKey = storageKeyToString(key);
      
      console.log('[FormManager] 저장 가능한 값 감지:', {
        storageKey,
        values
      });
      
      // TODO: 다음 단계에서 저장 확인 모달 표시
      // 지금은 콘솔에만 출력
    }
  }

  // 디버깅용 메소드들
  public getDetectedForms() {
    return this.detectedForms;
  }

  public manualCheck() {
    this.detectedForms.forEach(form => this.checkForSave(form));
  }
}

// FormManager 인스턴스 생성
const formManager = new FormManager();

// 디버깅을 위해 전역에 노출
(window as any).formManager = formManager;

console.log('[content] Form-ation 콘텐트 스크립트 로드됨');
