import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import {
  getAllFieldMemories,
  deleteFieldMemory,
  getFieldMemoryStats,
} from '../utils/fieldStorage'
import type { FieldMemory } from '../types/fieldMemory'
import './options.css'

function Options() {
  const [fieldMemories, setFieldMemories] = useState<FieldMemory[]>([]);
  const [stats, setStats] = useState<{
    totalCount: number;
    totalSize: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [memories, memoryStats] = await Promise.all([
        getAllFieldMemories(),
        getFieldMemoryStats()
      ]);
      setFieldMemories(memories);
      setStats({
        totalCount: memoryStats.totalCount,
        totalSize: memoryStats.totalSize,
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

  const handleDeleteMemory = async (id: string) => {
    if (!confirm('이 저장된 데이터를 삭제하시겠습니까?')) return;

    try {
      await deleteFieldMemory(id);
      await loadData(); // 데이터 새로고침
      alert('삭제 완료');
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제 실패');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('모든 저장된 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;

    try {
      // 모든 메모리 삭제
      await Promise.all(fieldMemories.map(memory => deleteFieldMemory(memory.id)));
      await loadData();
      alert('모든 데이터 삭제 완료');
    } catch (error) {
      console.error('전체 삭제 실패:', error);
      alert('삭제 실패');
    }
  };

  // 사이트별로 그룹화
  const groupedBySite = fieldMemories.reduce((acc, memory) => {
    const hostname = new URL(memory.url).hostname;
    if (!acc[hostname]) {
      acc[hostname] = [];
    }
    acc[hostname].push(memory);
    return acc;
  }, {} as Record<string, FieldMemory[]>);

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
          <p>저장된 필드 데이터를 관리할 수 있습니다.</p>
        </header>

        {/* 통계 정보 */}
        {stats && (
          <div className="stats-section">
            <div className="stat-item">
              <span className="stat-label">저장된 데이터</span>
              <span className="stat-value">{stats.totalCount}개</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">사용 용량</span>
              <span className="stat-value">{(stats.totalSize / 1024).toFixed(1)} KB</span>
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
                {Object.keys(groupedBySite).map(hostname => (
                  <option key={hostname} value={hostname}>
                    {hostname}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {/* 필드 메모리 목록 */}
        {Object.keys(filteredSites).length === 0 ? (
          <div className="empty-state">
            <h2>📝 저장된 데이터가 없습니다</h2>
            <p>웹 페이지에서 셀렉터 모드로 필드를 선택하고 저장하면 이곳에 표시됩니다.</p>
          </div>
        ) : (
          <div className="sites-list">
            {Object.entries(filteredSites).map(([hostname, memories]) => (
              <div key={hostname} className="site-section">
                <div className="site-header">
                  <h2>🌐 {hostname}</h2>
                </div>

                <div className="forms-list">
                  {memories.map((memory) => (
                    <div key={memory.id} className="form-item">
                      <div className="form-info">
                        <div className="form-title">
                          <span className="form-path">📄 {memory.title}</span>
                        </div>
                        <div className="form-meta">
                          <span>{memory.fields.length}개 필드</span>
                          <span>{new Date(memory.timestamp).toLocaleDateString()}</span>
                          {memory.useCount > 0 && <span>{memory.useCount}회 사용</span>}
                        </div>
                        <div className="form-fields">
                          {memory.fields.slice(0, 3).map((field, idx) => (
                            <span key={idx} className="field-preview">
                              {field.label}: {String(field.value).slice(0, 20)}{String(field.value).length > 20 ? '...' : ''}
                            </span>
                          ))}
                          {memory.fields.length > 3 && (
                            <span className="field-preview">
                              ... 외 {memory.fields.length - 3}개
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="form-actions">
                        <button
                          onClick={() => handleDeleteMemory(memory.id)}
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
