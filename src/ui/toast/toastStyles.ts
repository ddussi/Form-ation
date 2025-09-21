export const TOAST_STYLES = `
/* Formation 토스트 스타일 */

.formation-toast {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 12px 16px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 300px;
  max-width: 400px;
  pointer-events: all;
  animation: formation-toast-slide-in 0.3s ease-out;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  border-left: 4px solid #007cba;
}

@keyframes formation-toast-slide-in {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.formation-toast-success {
  border-left-color: #28a745;
  background: #f8fff9;
}

.formation-toast-info {
  border-left-color: #007cba;
  background: #f8fcff;
}

.formation-toast-warning {
  border-left-color: #ffc107;
  background: #fffdf8;
}

.formation-toast-error {
  border-left-color: #dc3545;
  background: #fff8f8;
}

.formation-toast-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.formation-toast-icon {
  font-size: 16px;
  line-height: 1;
}

.formation-toast-message {
  color: #333;
  font-weight: 500;
}

.formation-toast-close {
  background: none;
  border: none;
  font-size: 18px;
  color: #666;
  cursor: pointer;
  padding: 0;
  margin-left: 12px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.formation-toast-close:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

@media (max-width: 480px) {
  .formation-toast {
    min-width: 280px;
    max-width: calc(100vw - 40px);
  }
}
`;
