// 자동입력 확인 모달 컴포넌트

export interface AutofillConfirmModalProps {
  isVisible: boolean;
  onAutofill: () => void;
  onNoThisTime: () => void;
  onNeverAsk: () => void;
  onClose: () => void;
  formInfo?: {
    fieldCount: number;
    url: string;
    previewData: Record<string, string>;
    remainingFormsCount: number;
  };
}

export const AutofillConfirmModal: React.FC<AutofillConfirmModalProps> = ({
  isVisible,
  onAutofill,
  onNoThisTime,
  onNeverAsk,
  onClose,
  formInfo
}) => {
  if (!isVisible) return null;

  const previewEntries = formInfo?.previewData 
    ? Object.entries(formInfo.previewData).slice(0, 3) // 최대 3개만 미리보기
    : [];

  return (
    <div className="formation-modal-overlay" onClick={onClose}>
      <div className="formation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="formation-modal-header">
          <h3>🔄 자동입력 {formInfo?.remainingFormsCount !== undefined && formInfo.remainingFormsCount > 0 ? 
            '(다중 폼)' : ''}</h3>
          <button className="formation-close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="formation-modal-body">
          <p className="formation-question">
            저장된 값으로 이 폼을 채울까요?
          </p>
          
          {formInfo && (
            <div className="formation-form-info">
              <div>📋 필드 수: {formInfo.fieldCount}개</div>
              <div>🌐 사이트: {new URL(formInfo.url).hostname}</div>
              {formInfo.remainingFormsCount > 0 && (
                <div>⏭️ 대기 중인 폼: {formInfo.remainingFormsCount}개</div>
              )}
            </div>
          )}

          {previewEntries.length > 0 && (
            <div className="formation-preview">
              <h4>📄 저장된 데이터 미리보기:</h4>
              {previewEntries.map(([fieldName, value]) => (
                <div key={fieldName} className="formation-preview-item">
                  <span className="formation-field-name">{fieldName}:</span>
                  <span className="formation-field-value">{value.slice(0, 20)}{value.length > 20 ? '...' : ''}</span>
                </div>
              ))}
              {formInfo && Object.keys(formInfo.previewData).length > 3 && (
                <div className="formation-preview-more">
                  ... 외 {Object.keys(formInfo.previewData).length - 3}개 더
                </div>
              )}
            </div>
          )}
          
          <p className="formation-description">
            기존 값이 있는 필드는 덮어쓰지 않습니다.
          </p>
        </div>
        
        <div className="formation-modal-actions">
          <button 
            className="formation-btn formation-btn-primary"
            onClick={onAutofill}
          >
            입력
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
