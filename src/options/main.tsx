import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

function Options() {
  return (
    <StrictMode>
      <div style={{ padding: 16 }}>
        <h1>Form-ation Options</h1>
        <p>옵션 페이지 예제입니다.</p>
      </div>
    </StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<Options />)


