import { useState, useEffect } from 'react';
import type { FieldMemory } from '../types';

export function Options() {
  const [memories, setMemories] = useState<FieldMemory[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<FieldMemory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAlias, setEditingAlias] = useState('');
  const [stats, setStats] = useState({ totalCount: 0, totalSize: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterMemories();
  }, [memories, searchTerm]);

  const loadData = () => {
    setLoading(true);

    chrome.runtime.sendMessage({ type: 'GET_ALL_MEMORIES' }, (response: FieldMemory[] | undefined) => {
      setMemories(response || []);
      setLoading(false);
    });

    chrome.runtime.sendMessage({ type: 'GET_STATS' }, (response: { totalCount: number; totalSize: number } | undefined) => {
      if (response) {
        setStats(response);
      }
    });
  };

  const filterMemories = () => {
    if (!searchTerm.trim()) {
      setFilteredMemories(memories);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = memories.filter(
      (m) =>
        m.alias.toLowerCase().includes(term) ||
        m.url.toLowerCase().includes(term) ||
        m.fields.some(
          (f) =>
            f.label.toLowerCase().includes(term) ||
            f.value.toLowerCase().includes(term)
        )
    );
    setFilteredMemories(filtered);
  };

  const handleDelete = (id: string) => {
    if (!confirm('이 데이터를 삭제하시겠습니까?')) return;

    chrome.runtime.sendMessage({ type: 'DELETE_MEMORY', id }, (response: { success?: boolean } | undefined) => {
      if (response?.success) {
        loadData();
      }
    });
  };

  const handleDeleteAll = () => {
    if (!confirm('모든 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;

    Promise.all(
      memories.map(
        (m) =>
          new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'DELETE_MEMORY', id: m.id }, resolve);
          })
      )
    ).then(() => {
      loadData();
    });
  };

  const startEditing = (memory: FieldMemory) => {
    setEditingId(memory.id);
    setEditingAlias(memory.alias);
  };

  const saveAlias = (id: string) => {
    if (!editingAlias.trim()) return;

    chrome.runtime.sendMessage(
      { type: 'UPDATE_MEMORY', id, data: { alias: editingAlias.trim() } },
      (response: { success?: boolean } | undefined) => {
        if (response?.success) {
          setEditingId(null);
          loadData();
        }
      }
    );
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingAlias('');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const truncateUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + urlObj.pathname.slice(0, 30);
    } catch {
      return url.slice(0, 50);
    }
  };

  if (loading) {
    return (
      <div className="options-container">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="options-container">
      <header className="options-header">
        <h1>
          <span>📝</span> Form-ation 관리
        </h1>
        <p>저장된 폼 데이터를 관리할 수 있습니다.</p>
      </header>

      <div className="stats-section">
        <div className="stat-card">
          <div className="stat-label">저장된 데이터</div>
          <div className="stat-value">{stats.totalCount}개</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">사용 용량</div>
          <div className="stat-value">{formatSize(stats.totalSize)}</div>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="검색 (URL, 별칭, 필드값...)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="btn btn-secondary" onClick={loadData}>
          새로고침
        </button>
        {memories.length > 0 && (
          <button className="btn btn-danger" onClick={handleDeleteAll}>
            모두 삭제
          </button>
        )}
      </div>

      {filteredMemories.length === 0 ? (
        <div className="memory-table">
          <div className="empty-state">
            <h2>{searchTerm ? '검색 결과가 없습니다' : '저장된 데이터가 없습니다'}</h2>
            <p>
              {searchTerm
                ? '다른 검색어를 시도해보세요.'
                : '웹 페이지에서 폼 데이터를 저장하면 여기에 표시됩니다.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="memory-table">
          <table>
            <thead>
              <tr>
                <th>별칭</th>
                <th>URL</th>
                <th>필드</th>
                <th>저장일</th>
                <th>사용</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredMemories.map((memory) => (
                <tr key={memory.id}>
                  <td>
                    {editingId === memory.id ? (
                      <input
                        type="text"
                        className="memory-alias-input"
                        value={editingAlias}
                        onChange={(e) => setEditingAlias(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveAlias(memory.id);
                          if (e.key === 'Escape') cancelEditing();
                        }}
                        onBlur={() => saveAlias(memory.id)}
                        autoFocus
                      />
                    ) : (
                      <span
                        className="memory-alias"
                        onClick={() => startEditing(memory)}
                        style={{ cursor: 'pointer' }}
                        title="클릭하여 수정"
                      >
                        {memory.alias}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="memory-url" title={memory.url}>
                      {truncateUrl(memory.url)}
                    </span>
                  </td>
                  <td className="memory-fields">{memory.fields.length}개</td>
                  <td className="memory-meta">{formatDate(memory.createdAt)}</td>
                  <td className="memory-meta">{memory.useCount}회</td>
                  <td>
                    <div className="memory-actions">
                      <button
                        className="btn-icon danger"
                        onClick={() => handleDelete(memory.id)}
                        title="삭제"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
