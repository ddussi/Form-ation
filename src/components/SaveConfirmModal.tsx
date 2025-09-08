// React 19의 새로운 JSX Transform 사용 - React import 불필요

export interface SaveConfirmModalProps {
  isVisible: boolean;
  onSave: () => void;
  onNoThisTime: () => void;
  onNeverAsk: () => void;
  onClose: () => void;
  formInfo?: {
    fieldCount: number;
    url: string;
  };
}

export const SaveConfirmModal: React.FC<SaveConfirmModalProps> = ({
  isVisible,
  onSave,
  onNoThisTime,
  onNeverAsk,
  onClose,
  formInfo
}) => {
  if (!isVisible) return null;

  return (
    <div className="formation-modal-overlay" onClick={onClose}>
      <div className="formation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="formation-modal-header">
          <h3>💾 폼 저장</h3>
          <button className="formation-close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="formation-modal-body">
          <p className="formation-question">
            이 폼의 입력값을 저장할까요?
          </p>
          
          {formInfo && (
            <div className="formation-form-info">
              <div>📋 필드 수: {formInfo.fieldCount}개</div>
              <div>🌐 사이트: {new URL(formInfo.url).hostname}</div>
            </div>
          )}
          
          <p className="formation-description">
            다음에 같은 폼을 방문할 때 저장된 값으로 자동입력을 제안합니다.
          </p>
        </div>
        
        <div className="formation-modal-actions">
          <button 
            className="formation-btn formation-btn-primary"
            onClick={onSave}
          >
            저장
          </button>
          <button 
            className="formation-btn formation-btn-secondary"
            onClick={onNoThisTime}
          >
            이번만 아니오
          </button>
          <button 
            className="formation-btn formation-btn-tertiary"
            onClick={onNeverAsk}
          >
            다시 묻지 않기
          </button>
        </div>
      </div>
    </div>
  );
};
