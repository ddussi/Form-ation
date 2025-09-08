chrome.runtime.onInstalled.addListener((): void => {
  console.log('[background] installed');
});

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse): boolean | void => {
  if (message && typeof message === 'object' && 'type' in message && message.type === 'PING') {
    sendResponse({ type: 'PONG', from: 'background' });
    return true;
  }
});


