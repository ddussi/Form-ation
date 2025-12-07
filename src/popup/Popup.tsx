import { useState, useEffect } from 'react';
import type { FieldMemory } from '../types';

export function Popup() {
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [memories, setMemories] = useState<FieldMemory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    // 현재 탭 URL 가져오기
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tabs[0]?.url || '';
    setCurrentUrl(url);

    // 해당 URL의 저장된 메모리 가져오기
    if (url) {
      chrome.runtime.sendMessage(
        { type: 'GET_MEMORIES_FOR_URL', url },
        (response: FieldMemory[]) => {
          setMemories(response || []);
          setLoading(false);
        }
      );
    } else {
      setLoading(false);
    }
  };

  const handleNewSave = async () => {
    // 셀렉터 모드 활성화
    chrome.runtime.sendMessage({ type: 'ACTIVATE_SELECTOR_MODE' });
    window.close();
  };

  const handleSelectMemory = async (memory: FieldMemory) => {
    // 자동 입력 실행
    chrome.runtime.sendMessage(
      { type: 'EXECUTE_AUTOFILL', memoryId: memory.id },
      () => {
        window.close();
      }
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  const truncateUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname + urlObj.search;
      return urlObj.hostname + (path.length > 30 ? path.slice(0, 30) + '...' : path);
    } catch {
      return url.slice(0, 50);
    }
  };

  if (loading) {
    return (
      <div className="popup-container">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="popup-container">
      <header className="popup-header">
        <span className="logo">📝</span>
        <h1>Form-ation</h1>
      </header>

      <div className="current-url">{truncateUrl(currentUrl)}</div>

      {memories.length > 0 ? (
        <>
          <div className="memory-list">
            {memories.map((memory) => (
              <div
                key={memory.id}
                className="memory-item"
                onClick={() => handleSelectMemory(memory)}
              >
                <div className="memory-item-header">
                  <span className="memory-alias">{memory.alias}</span>
                  <span className="memory-field-count">
                    {memory.fields.length}개 필드
                  </span>
                </div>

                <div className="memory-preview">
                  {memory.fields.slice(0, 2).map((field, idx) => (
                    <span key={idx} className="memory-preview-item">
                      {field.label}: {field.value.slice(0, 20)}
                      {field.value.length > 20 ? '...' : ''}
                    </span>
                  ))}
                  {memory.fields.length > 2 && (
                    <span className="memory-preview-item">
                      외 {memory.fields.length - 2}개...
                    </span>
                  )}
                </div>

                <div className="memory-meta">
                  <span>{formatDate(memory.createdAt)}</span>
                  {memory.useCount > 0 && <span>{memory.useCount}회 사용</span>}
                </div>
              </div>
            ))}
          </div>

          <button className="btn btn-secondary" onClick={handleNewSave}>
            + 새로 저장하기
          </button>
        </>
      ) : (
        <div className="empty-state">
          <p>저장된 데이터가 없습니다.</p>
          <button className="btn btn-primary" onClick={handleNewSave}>
            + 새로 저장하기
          </button>
        </div>
      )}

      <a
        href={chrome.runtime.getURL('src/options/index.html')}
        target="_blank"
        className="footer-link"
      >
        전체 데이터 관리 →
      </a>
    </div>
  );
}
