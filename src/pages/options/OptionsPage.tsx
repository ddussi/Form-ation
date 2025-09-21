import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { 
  getAllStoredData,
  deleteFormData
} from '../../utils/simpleStorage'
// import type { SiteSettings } from '../../shared/types'
import './options.css'

function Options() {
  const [formDataItems, setFormDataItems] = useState<any[]>([]);
  const [storageInfo, setStorageInfo] = useState<{
    bytesInUse: number;
    itemCount: number;
    formDataCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const items = await getAllStoredData();
      setFormDataItems(items.map(item => ({
        ...item.data,
        storageKey: item.key
      })));
      setStorageInfo({
        bytesInUse: 1024,
        itemCount: items.length,
        formDataCount: items.length
      });
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteForm = async (storageKey: string) => {
    if (!confirm('이 폼의 저장된 데이터를 삭제하시겠습니까?')) return;
    
    try {
      await deleteFormData(storageKey);
      await loadData(); // 데이터 새로고침
      alert('삭제 완료');
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제 실패');
    }
  };

  const handleDeleteSite = async (origin: string) => {
    if (!confirm(`${origin} 사이트의 모든 데이터를 삭제하시겠습니까?`)) return;
    
    try {
      // TODO: 간단한 사이트 삭제 구현
      alert('사이트 삭제 기능은 추후 구현됩니다');
    } catch (error) {
      console.error('사이트 삭제 실패:', error);
      alert('삭제 실패');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('모든 저장된 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;
    
    try {
      // TODO: 간단한 전체 삭제 구현
      alert('전체 삭제 기능은 추후 구현됩니다');
    } catch (error) {
      console.error('전체 삭제 실패:', error);
      alert('삭제 실패');
    }
  };

  const handleSettingChange = async (
    origin: string, 
    formSignature: string, 
    field: string, 
    value: string
  ) => {
    try {
      // TODO: 간단한 설정 변경 구현
      console.log('설정 변경:', origin, formSignature, field, value);
    } catch (error) {
      console.error('설정 변경 실패:', error);
      alert('설정 변경 실패');
    }
  };

  // 사이트별로 그룹화
  const groupedBySite = formDataItems.reduce((acc, item) => {
    if (!acc[item.origin]) {
      acc[item.origin] = [];
    }
    acc[item.origin].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const filteredSites = selectedSite 
    ? { [selectedSite]: groupedBySite[selectedSite] || [] }
    : groupedBySite;

  if (loading) {
    return (
      <StrictMode>
        <div className="options-container">
          <div className="loading">데이터 로딩 중...</div>
        </div>
      </StrictMode>
    );
  }

  return (
    <StrictMode>
      <div className="options-container">
        <header className="options-header">
          <h1>🔄 Form-ation 관리</h1>
          <p>저장된 폼 데이터를 관리하고 설정을 변경할 수 있습니다.</p>
        </header>

        {/* 통계 정보 */}
        {storageInfo && (
          <div className="stats-section">
            <div className="stat-item">
              <span className="stat-label">저장된 폼</span>
              <span className="stat-value">{storageInfo.formDataCount}개</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">전체 항목</span>
              <span className="stat-value">{storageInfo.itemCount}개</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">사용 용량</span>
              <span className="stat-value">{(storageInfo.bytesInUse / 1024).toFixed(1)} KB</span>
            </div>
          </div>
        )}

        {/* 전체 작업 */}
        <div className="global-actions">
          <button onClick={() => loadData()} className="btn btn-secondary">
            🔄 새로고침
          </button>
          <button onClick={handleDeleteAll} className="btn btn-danger">
            🗑️ 모든 데이터 삭제
          </button>
        </div>

        {/* 사이트 필터 */}
        {Object.keys(groupedBySite).length > 1 && (
          <div className="site-filter">
            <label>
              사이트 필터:
              <select 
                value={selectedSite} 
                onChange={(e) => setSelectedSite(e.target.value)}
              >
                <option value="">모든 사이트</option>
                {Object.keys(groupedBySite).map(origin => (
                  <option key={origin} value={origin}>
                    {new URL(origin).hostname}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {/* 폼 데이터 목록 */}
        {Object.keys(filteredSites).length === 0 ? (
          <div className="empty-state">
            <h2>📝 저장된 폼이 없습니다</h2>
            <p>웹 페이지에서 폼을 제출하고 저장하면 이곳에 표시됩니다.</p>
          </div>
        ) : (
          <div className="sites-list">
            {Object.entries(filteredSites).map(([origin, items]) => (
              <div key={origin} className="site-section">
                <div className="site-header">
                  <h2>🌐 {new URL(origin).hostname}</h2>
                  <button 
                    onClick={() => handleDeleteSite(origin)}
                    className="btn btn-danger btn-small"
                  >
                    사이트 전체 삭제
                  </button>
                </div>

                <div className="forms-list">
                  {(items as any[]).map((item: any) => (
                    <div key={item.storageKey} className="form-item">
                      <div className="form-info">
                        <div className="form-title">
                          <span className="form-path">
                            {item.isFieldMemory ? '📝' : '📄'} {item.path}
                          </span>
                          <span className="form-signature">{item.formSignature}</span>
                          {item.isFieldMemory && (
                            <span className="form-type-badge field-memory">필드 기억 모드</span>
                          )}
                          {!item.isFieldMemory && (
                            <span className="form-type-badge legacy">기존 폼</span>
                          )}
                        </div>
                        <div className="form-meta">
                          <span>{Object.keys(item.data.fields).length}개 필드</span>
                          <span>{new Date(item.data.timestamp).toLocaleDateString()}</span>
                          {item.isFieldMemory && item.fieldMemory && (
                            <span className="usage-count">사용 {item.fieldMemory.useCount || 0}회</span>
                          )}
                        </div>
                        <div className="form-fields">
                          {Object.entries(item.data.fields).slice(0, 3).map(([field, value]) => (
                            <span key={field} className="field-preview">
                              {field}: {String(value).slice(0, 20)}{String(value).length > 20 ? '...' : ''}
                            </span>
                          ))}
                          {Object.keys(item.data.fields).length > 3 && (
                            <span className="field-preview">
                              ... 외 {Object.keys(item.data.fields).length - 3}개
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="form-settings">
                        <div className="setting-group">
                          <label>저장 모드:</label>
                          <select
                            value={item.settings.saveMode}
                            onChange={(e) => handleSettingChange(
                              item.origin, 
                              item.formSignature, 
                              'saveMode', 
                              e.target.value
                            )}
                          >
                            <option value="ask">묻기</option>
                            <option value="always">항상</option>
                            <option value="never">안함</option>
                          </select>
                        </div>

                        <div className="setting-group">
                          <label>자동입력 모드:</label>
                          <select
                            value={item.settings.autofillMode}
                            onChange={(e) => handleSettingChange(
                              item.origin, 
                              item.formSignature, 
                              'autofillMode', 
                              e.target.value
                            )}
                          >
                            <option value="ask">묻기</option>
                            <option value="always">항상</option>
                            <option value="never">안함</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-actions">
                        <button 
                          onClick={() => handleDeleteForm(item.storageKey)}
                          className="btn btn-danger btn-small"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </StrictMode>
  );
}

createRoot(document.getElementById('root')!).render(<Options />)
