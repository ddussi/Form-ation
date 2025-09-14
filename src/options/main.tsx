import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { 
  getAllFormData, 
  deleteFormData, 
  deleteSiteData, 
  deleteAllData, 
  updateFormSettings,
  getStorageInfo 
} from '../utils/optionsStorage'
import type { FormDataItem } from '../utils/optionsStorage'
import type { SiteSettings } from '../utils/storage'
import './options.css'

function Options() {
  const [formDataItems, setFormDataItems] = useState<FormDataItem[]>([]);
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
      const [items, info] = await Promise.all([
        getAllFormData(),
        getStorageInfo()
      ]);
      setFormDataItems(items);
      setStorageInfo(info);
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
      await deleteSiteData(origin);
      await loadData();
      alert('사이트 데이터 삭제 완료');
    } catch (error) {
      console.error('사이트 삭제 실패:', error);
      alert('삭제 실패');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('모든 저장된 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;
    
    try {
      await deleteAllData();
      await loadData();
      alert('모든 데이터 삭제 완료');
    } catch (error) {
      console.error('전체 삭제 실패:', error);
      alert('삭제 실패');
    }
  };

  const handleSettingChange = async (
    origin: string, 
    formSignature: string, 
    field: keyof SiteSettings, 
    value: string
  ) => {
    try {
      await updateFormSettings(origin, formSignature, { [field]: value });
      await loadData();
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
  }, {} as Record<string, FormDataItem[]>);

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
                  {items.map((item) => (
                    <div key={item.storageKey} className="form-item">
                      <div className="form-info">
                        <div className="form-title">
                          <span className="form-path">📄 {item.path}</span>
                          <span className="form-signature">{item.formSignature}</span>
                        </div>
                        <div className="form-meta">
                          <span>{Object.keys(item.data.fields).length}개 필드</span>
                          <span>{new Date(item.data.timestamp).toLocaleDateString()}</span>
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


