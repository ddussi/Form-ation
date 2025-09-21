import React from 'react';
import './ToggleSwitch.css';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function ToggleSwitch({ 
  checked, 
  onChange, 
  disabled = false, 
  className = '' 
}: ToggleSwitchProps) {
  const toggleId = React.useId();

  return (
    <div className={`toggle-switch ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="toggle-checkbox"
        id={toggleId}
      />
      <label 
        htmlFor={toggleId}
        className="toggle-label"
      >
        <span className="toggle-inner"></span>
        <span className="toggle-switch-handle"></span>
      </label>
    </div>
  );
}
