chrome.runtime.onInstalled.addListener(async (): Promise<void> => {
  console.log('[background] Form-ation installed');
});

// 확장 아이콘 클릭 이벤트 처리 (셀렉터 모드 활성화)
chrome.action.onClicked.addListener(async (tab: any): Promise<void> => {
  console.log('[background] 확장 아이콘 클릭됨 - 셀렉터 모드 활성화');

  if (!tab.id) return;

  try {
    // 현재 탭에 셀렉터 모드 활성화 메시지 전송
    await chrome.tabs.sendMessage(tab.id, {
      type: 'ACTIVATE_SELECTOR_MODE'
    });

    console.log('[background] 셀렉터 모드 활성화 메시지 전송 완료');
  } catch (error) {
    console.error('[background] 셀렉터 모드 활성화 실패:', error);
  }
});

chrome.runtime.onMessage.addListener((message: unknown, _sender: any, sendResponse: any): boolean | void => {
  console.log('[Background] 메시지 받음:', message);

  if (!message || typeof message !== 'object') return;

  const msg = message as any;

  switch (msg.type) {
    case 'PING':
      sendResponse({ type: 'PONG', from: 'background' });
      return true;
  }
});


