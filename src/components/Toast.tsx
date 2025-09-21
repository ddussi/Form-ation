// 토스트 알림 컴포넌트

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onHide: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  isVisible,
  onHide
}) => {
  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  return (
    <div className={`formation-toast formation-toast-${type}`}>
      <div className="formation-toast-content">
        <span className="formation-toast-icon">{getIcon()}</span>
        <span className="formation-toast-message">{message}</span>
      </div>
      <button 
        className="formation-toast-close" 
        onClick={onHide}
        aria-label="닫기"
      >
        ×
      </button>
    </div>
  );
};
