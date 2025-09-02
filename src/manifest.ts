import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Form-ation',
  version: '0.0.0',
  action: {
    default_popup: 'index.html',
  },
  // 필요한 권한/스크립트/아이콘은 이후 단계에서 추가합니다.
});
