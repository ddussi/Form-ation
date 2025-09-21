/**
 * 메시지 핸들러: Chrome Extension 메시지 처리
 */

import type { FormOrchestrator } from '../FormOrchestrator';

interface SimpleMessage {
  type: string;
  isEnabled?: boolean;
  [key: string]: any;
}

export class MessageHandler {
  private orchestrator: FormOrchestrator;

  constructor(orchestrator: FormOrchestrator) {
    this.orchestrator = orchestrator;
  }

  setup() {
    // Background script에서 보내는 메시지 처리
    chrome.runtime.onMessage.addListener((message: SimpleMessage) => {
      this.handleMessage(message);
    });
  }

  private handleMessage(message: SimpleMessage) {
    switch (message.type) {
      case 'SAVE_MODE_CHANGED':
        console.log('[MessageHandler] 저장 모드 변경됨:', message.isEnabled ? 'ON' : 'OFF');
        this.orchestrator.handleSaveModeChanged(message.isEnabled || false);
        break;
        
      case 'ACTIVATE_SELECTOR_MODE':
        console.log('[MessageHandler] 셀렉터 모드 활성화 요청');
        this.orchestrator.activateSelectorMode();
        break;
        
      case 'DEACTIVATE_SELECTOR_MODE':
        console.log('[MessageHandler] 셀렉터 모드 비활성화 요청');
        this.orchestrator.deactivateSelectorMode();
        break;
    }
  }

  cleanup() {
    // 필요시 정리 작업
  }
}
