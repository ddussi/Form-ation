import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Popup } from './Popup';

// 루트 요소가 존재하는지 확인
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

// React 앱 렌더링
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <Popup />
  </StrictMode>
);

console.log('[Popup] Form-ation React 팝업 로드됨');
