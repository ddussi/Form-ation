/**
 * 자동입력 서비스: 저장된 데이터를 기반으로 자동입력 제공
 */

import { generateStorageKey, storageKeyToString } from '../../../features/form-detection';
import { matchFieldsForAutofill, generatePreviewData, executeAutofill } from '../../../core/autofill';
import { getFormData, getSiteSettings, saveSiteSettings } from '../../../core/storage';
import { notificationBridge } from '../../../infrastructure/messaging';
import { toastManager } from '../../../ui/toast';
import type { FormInfo } from '../../../shared/types';

export class AutofillService {
  private autofillQueue: Array<{ form: FormInfo; storedData: any; previewData: Record<string, string> }> = [];
  private isProcessingAutofill = false;

  async checkForAutofill(form: FormInfo): Promise<void> {
    try {
      const key = generateStorageKey(form);
      const storedData = await getFormData(key);
      
      if (storedData && Object.keys(storedData.fields).length > 0) {
        await this.queueAutofillIfNeeded(form, storedData);
      }
    } catch (error) {
      console.error('[AutofillService] 자동입력 체크 에러:', error);
    }
  }

  private async queueAutofillIfNeeded(form: FormInfo, storedData: any) {
    const key = generateStorageKey(form);
    const settings = await getSiteSettings(key.origin, key.formSignature);
    
    // 매칭 가능한 필드 확인
    const matches = matchFieldsForAutofill(form, storedData);
    const previewData = generatePreviewData(matches);
    
    if (Object.keys(previewData).length === 0) {
      console.log('[AutofillService] 자동입력 가능한 필드 없음:', key.formSignature);
      return;
    }

    const storageKey = storageKeyToString(key);
    console.log('[AutofillService] 자동입력 가능한 데이터 발견:', {
      storageKey,
      matchCount: matches.length,
      autofillableCount: Object.keys(previewData).length
    });

    switch (settings.autofillMode) {
      case 'always':
        // 바로 자동입력
        await this.performAutofill(form, storedData);
        break;
        
      case 'never':
        // 자동입력하지 않음
        console.log('[AutofillService] 자동입력 안 함 (사용자 설정):', storageKey);
        break;
        
      case 'ask':
      default:
        // 큐에 추가
        this.autofillQueue.push({ form, storedData, previewData });
        this.processAutofillQueue();
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
      
      console.log(`[AutofillService] 자동입력 큐 처리 중... (남은 폼: ${this.autofillQueue.length}개)`);
      
      // 사용자 응답을 기다림
      await this.showAutofillConfirmAndWait(form, storedData, previewData);
    }

    this.isProcessingAutofill = false;
    console.log('[AutofillService] 모든 자동입력 큐 처리 완료');
  }

  private showAutofillConfirmAndWait(
    form: FormInfo, 
    storedData: any, 
    previewData: Record<string, string>
  ): Promise<void> {
    return new Promise(async (resolve) => {
      const key = generateStorageKey(form);
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
          console.log('[AutofillService] 이번만 자동입력 안 함:', storageKeyToString(key));
          resolve();
        },
        // 다시 묻지 않기
        async () => {
          console.log('[AutofillService] 자동입력 다시 묻지 않기 설정:', storageKeyToString(key));
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
      
      console.log('[AutofillService] 자동입력 완료:', {
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
      console.error('[AutofillService] 자동입력 실패:', error);
      toastManager.error('자동입력 실패');
    }
  }

  async manualAutofillTest(form: FormInfo) {
    const key = generateStorageKey(form);
    const storedData = await getFormData(key);
    
    if (storedData) {
      const matches = matchFieldsForAutofill(form, storedData);
      const previewData = generatePreviewData(matches);
      
      if (Object.keys(previewData).length > 0) {
        await this.showAutofillConfirmAndWait(form, storedData, previewData);
      }
    }
  }
}
