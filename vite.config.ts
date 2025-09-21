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
    // 프로덕션 빌드에서 console 및 debugger 제거
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));
