import React from 'react';
import './ActionButton.css';

interface ActionButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  icon?: string;
}

export function ActionButton({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  className = '',
  icon
}: ActionButtonProps) {
  return (
    <button
      className={`action-button ${variant} ${size} ${className} ${loading ? 'loading' : ''}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {icon && <span className="button-icon">{icon}</span>}
      {loading ? (
        <span className="loading-spinner">⏳</span>
      ) : (
        children
      )}
    </button>
  );
}
