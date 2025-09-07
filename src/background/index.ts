chrome.runtime.onInstalled.addListener((): void => {
  console.log('[background] installed');
});

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse): boolean | void => {
  if (message?.type === 'PING') {
    sendResponse({ type: 'PONG', from: 'background' });
    return true;
  }
});


