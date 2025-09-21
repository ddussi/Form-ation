/**
 * 저장 서비스: 폼 데이터 저장 로직 담당
 */

import { collectFieldValues, generateStorageKey, storageKeyToString } from '../../../features/form-detection';
import { getSiteSettings, getGlobalSaveMode, setGlobalSaveMode } from '../../../core/storage';
import { notificationBridge } from '../../../infrastructure/messaging';
import { toastManager } from '../../../ui/toast';
import type { FormInfo } from '../../../shared/types';

export class SaveService {
  private pendingSaves = new Map<string, { form: FormInfo; values: Record<string, string> }>();

  async checkForSave(form: FormInfo): Promise<void> {
    const values = collectFieldValues(form.fields);
    const hasValues = Object.keys(values).length > 0;
    
    if (!hasValues) return;
    
    // 글로벌 저장 모드 확인 - OFF면 저장 안함
    const globalSaveMode = await getGlobalSaveMode();
    if (!globalSaveMode.isEnabled) {
      console.log('[SaveService] 저장 모드 OFF - 저장 생략');
      return;
    }
    
    const key = generateStorageKey(form);
    const storageKey = storageKeyToString(key);
    
    console.log('[SaveService] 저장 가능한 값 감지 (저장 모드 ON):', {
      storageKey,
      values
    });
    
    // 사이트 설정 확인
    const settings = await getSiteSettings(key.origin, key.formSignature);
    
    // 중복 모달 방지
    if (this.pendingSaves.has(storageKey)) {
      console.log('[SaveService] 이미 저장 모달이 표시 중:', storageKey);
      return;
    }
    
    switch (settings.saveMode) {
      case 'always':
        // 바로 저장 (Background Script에서 처리됨)
        console.log('[SaveService] 자동 저장 모드 - Background에서 처리');
        break;
        
      case 'never':
        // 저장하지 않음
        console.log('[SaveService] 저장 안 함 (사용자 설정):', storageKey);
        break;
        
      case 'ask':
      default:
        // 브라우저 알림으로 확인
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
        console.log('[SaveService] 저장 완료 (Background에서 처리됨)');
        this.pendingSaves.delete(storageKey);
        
        // 토스트 알림 표시
        const fieldCount = Object.keys(values).length;
        toastManager.success(`폼 데이터 저장됨 (${fieldCount}개 필드)`);
        
        // 저장 완료 후 자동으로 저장 모드 OFF
        this.autoDisableSaveMode();
      },
      () => {
        // 이번에는 안함
        console.log('[SaveService] 사용자가 저장을 취소함');
        this.pendingSaves.delete(storageKey);
      },
      () => {
        // 다시 묻지 않음 (Background Script에서 이미 설정 완료)
        console.log('[SaveService] 다시 묻지 않음 설정 완료 (Background에서 처리됨)');
        this.pendingSaves.delete(storageKey);
      }
    );
  }

  private async autoDisableSaveMode() {
    try {
      await setGlobalSaveMode(false);
      
      // Background script에 상태 변경 알림
      chrome.runtime.sendMessage({
        type: 'UPDATE_ICON_STATE'
      }).catch(() => {
        // 에러 무시 (background script가 없을 수도 있음)
      });
      
      console.log('[SaveService] 저장 모드 자동 OFF 설정됨');
    } catch (error) {
      console.error('[SaveService] 저장 모드 자동 OFF 실패:', error);
    }
  }

  async manualSaveTest(form: FormInfo) {
    const values = collectFieldValues(form.fields);
    if (Object.keys(values).length > 0) {
      await this.showSaveConfirmNotification(form, values);
    }
  }
}
