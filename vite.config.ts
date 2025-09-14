import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), crx({ manifest })],
  build: {
    // 프로덕션 빌드에서 console.log 제거
    minify: 'esbuild',
  },
  esbuild: {
    // 디버깅을 위해 임시로 console.log 유지
    drop: mode === 'production' ? ['debugger'] : [], // console 제거 비활성화
  },
}));
