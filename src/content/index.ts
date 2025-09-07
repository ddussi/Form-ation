window.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'PING', from: 'content' }, (resp) => {
    console.log('[content] response', resp);
  });
});


