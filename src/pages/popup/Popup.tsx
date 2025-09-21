import { useState, useEffect, useCallback } from 'react';
import { ToggleSwitch, ActionButton, StatusMessage } from '../../components/ui';
import './popup.css';

interface MessageResponse {
  success?: boolean;
  isEnabled?: boolean;
  error?: string;
}

export function Popup() {
  const [saveMode, setSaveMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error' | 'loading'>('info');
  const [selectorModeLoading, setSelectorModeLoading] = useState<boolean>(false);

  // Chrome Extension API 헬퍼 함수들
  const sendMessage = useCallback((message: any): Promise<MessageResponse> => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response: MessageResponse) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response || {});
        }
      });
    });
  }, []);

  const sendTabMessage = useCallback((tabId: number, message: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response: any) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }, []);

  // 상태 메시지 설정 함수
  const setStatus = useCallback((message: string, type: typeof statusType = 'info', duration?: number) => {
    setStatusMessage(message);
    setStatusType(type);

    if (duration) {
      setTimeout(() => {
        setStatusMessage('');
      }, duration);
    }
  }, []);

  // 초기 상태 로드
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        setStatus('상태 확인 중...', 'loading');

        // Background script에서 저장 모드 상태 가져오기
        const response = await sendMessage({ type: 'GET_SAVE_MODE_STATUS' });
        
        if (response && typeof response.isEnabled === 'boolean') {
          setSaveMode(response.isEnabled);
          setStatus('준비됨', 'success');
        } else {
          // Fallback: chrome.storage에서 직접 확인
          const result = await chrome.storage.local.get(['globalSaveMode']);
          const globalSaveMode = result.globalSaveMode || { isEnabled: false };
          setSaveMode(globalSaveMode.isEnabled);
          setStatus('준비됨', 'success');
        }
      } catch (error) {
        console.error('[Popup] 상태 로드 실패:', error);
        setStatus('연결 실패', 'error');
        setSaveMode(false); // 기본값
      } finally {
        setLoading(false);
      }
    };

    loadInitialState();
  }, [sendMessage, setStatus]);

  // 저장 모드 토글 핸들러
  const handleSaveModeToggle = useCallback(async (newValue: boolean) => {
    try {
      setStatus('저장 모드 변경 중...', 'loading');

      const response = await sendMessage({
        type: 'TOGGLE_SAVE_MODE',
        isEnabled: newValue
      });

      if (response.success) {
        setSaveMode(newValue);
        setStatus(
          newValue ? '저장 모드 활성화됨' : '저장 모드 비활성화됨',
          'success',
          2000
        );
      } else {
        throw new Error(response.error || '저장 모드 변경 실패');
      }
    } catch (error) {
      console.error('[Popup] 저장 모드 토글 실패:', error);
      setStatus('저장 모드 변경 실패', 'error', 3000);
      // 원래 값으로 되돌리기 (UI는 이미 변경됨)
      setSaveMode(!newValue);
    }
  }, [sendMessage, setStatus]);

  // 셀렉터 모드 활성화 핸들러
  const handleActivateSelectorMode = useCallback(async () => {
    try {
      setSelectorModeLoading(true);
      setStatus('필드 기억 모드 시작 중...', 'loading');

      // 현재 활성 탭 가져오기
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (!currentTab?.id) {
        throw new Error('활성 탭을 찾을 수 없습니다');
      }

      // Content script로 메시지 전송
      await sendTabMessage(currentTab.id, {
        type: 'ACTIVATE_SELECTOR_MODE'
      });

      setStatus('필드 기억 모드가 활성화되었습니다!', 'success');
      
      // 팝업 닫기 (사용자가 페이지에서 작업할 수 있도록)
      setTimeout(() => {
        window.close();
      }, 1000);

    } catch (error) {
      console.error('[Popup] 셀렉터 모드 활성화 실패:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Receiving end does not exist')) {
          setStatus('페이지를 새로고침 후 다시 시도해주세요', 'error', 5000);
        } else {
          setStatus('필드 기억 모드 시작 실패', 'error', 3000);
        }
      }
    } finally {
      setSelectorModeLoading(false);
    }
  }, [sendTabMessage, setStatus]);

  // 옵션 페이지 열기
  const handleOpenOptions = useCallback(() => {
    chrome.runtime.openOptionsPage();
    window.close();
  }, []);

  // 저장된 데이터 보기 (옵션 페이지로 이동)
  const handleViewData = useCallback(() => {
    chrome.runtime.openOptionsPage();
    window.close();
  }, []);

  if (loading) {
    return (
      <div className="popup-container loading">
        <div className="loading-spinner">
          <span>⏳</span>
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="popup-container">
      {/* Header */}
      <div className="popup-header">
        <div className="logo">
          <span className="icon">📋</span>
          <h1>Form-ation</h1>
        </div>
        <div className="version">v1.0.0</div>
      </div>

      {/* Save Mode Section */}
      <div className="section">
        <div className="section-header">
          <span className="section-icon">💾</span>
          <span className="section-title">저장 모드</span>
          <ToggleSwitch
            checked={saveMode}
            onChange={handleSaveModeToggle}
            disabled={loading}
          />
        </div>
        <div className="section-description">
          폼 제출 시 자동으로 저장 여부를 묻습니다
        </div>
      </div>

      {/* Selector Mode Section */}
      <div className="section">
        <div className="section-header">
          <span className="section-icon">📝</span>
          <span className="section-title">필드 기억 모드</span>
        </div>
        <div className="section-description">
          저장할 필드들을 직접 선택합니다
        </div>
        <ActionButton
          variant="primary"
          onClick={handleActivateSelectorMode}
          disabled={loading}
          loading={selectorModeLoading}
          icon="🎯"
          className="full-width"
        >
          필드 선택 시작
        </ActionButton>
      </div>

      {/* Quick Actions */}
      <div className="section">
        <div className="quick-actions">
          <ActionButton
            variant="secondary"
            onClick={handleOpenOptions}
            icon="⚙️"
          >
            설정
          </ActionButton>
          <ActionButton
            variant="secondary"
            onClick={handleViewData}
            icon="📊"
          >
            저장된 데이터
          </ActionButton>
        </div>
      </div>

      {/* Status Message */}
      <StatusMessage 
        message={statusMessage} 
        type={statusType}
      />
    </div>
  );
}
