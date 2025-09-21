import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Form-ation',
  version: '1.0.0',
  description: '웹 폼 입력값을 자동으로 저장하고 재방문 시 자동 완성해주는 편리한 도구입니다. 모든 데이터는 안전하게 로컬에만 저장됩니다.',
  icons: {
    16: 'icons/icon16.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },
  action: {
    default_title: 'Form-ation',
    default_popup: 'src/pages/popup/popup.html',
  },
  background: {
    service_worker: 'src/pages/background/BackgroundScript.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/pages/content/ContentScript.ts'],
      run_at: 'document_idle',
    },
  ],
  options_page: 'src/options/index.html',
  permissions: ['storage', 'activeTab', 'notifications'],
});