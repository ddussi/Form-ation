import './StatusMessage.css';

interface StatusMessageProps {
  message: string;
  type?: 'info' | 'success' | 'error' | 'loading';
  className?: string;
}

export function StatusMessage({ 
  message, 
  type = 'info', 
  className = '' 
}: StatusMessageProps) {
  if (!message) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'loading':
        return '⏳';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={`status-message ${type} ${className} ${type === 'loading' ? 'pulse' : ''}`}>
      <span className="status-icon">{getIcon()}</span>
      <span className="status-text">{message}</span>
    </div>
  );
}
