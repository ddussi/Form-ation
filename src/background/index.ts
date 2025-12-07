import { fieldMemoryRepository } from '../storage/FieldMemoryRepository';
import type { CreateFieldMemoryDto, UpdateFieldMemoryDto } from '../types';

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Form-ation] Extension installed');
});

chrome.runtime.onMessage.addListener(
  (
    message: unknown,
    _sender: unknown,
    sendResponse: (response?: unknown) => void
  ): boolean => {
    handleMessage(message as { type: string; [key: string]: unknown }, sendResponse);
    return true; // 비동기 응답
  }
);

async function handleMessage(
  message: { type: string; [key: string]: unknown },
  sendResponse: (response: unknown) => void
): Promise<void> {
  try {
    switch (message.type) {
      case 'ACTIVATE_SELECTOR_MODE': {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.id) {
          await chrome.tabs.sendMessage(tabs[0].id, { type: 'ACTIVATE_SELECTOR_MODE' });
        }
        sendResponse({ success: true });
        break;
      }

      case 'GET_MEMORIES_FOR_URL': {
        const memories = await fieldMemoryRepository.findByUrl(message.url as string);
        sendResponse(memories);
        break;
      }

      case 'GET_MEMORY_BY_ID': {
        const memory = await fieldMemoryRepository.findById(message.id as string);
        sendResponse(memory);
        break;
      }

      case 'GET_ALL_MEMORIES': {
        const memories = await fieldMemoryRepository.findAll();
        sendResponse(memories);
        break;
      }

      case 'SAVE_MEMORY': {
        const newMemory = await fieldMemoryRepository.create(message.data as CreateFieldMemoryDto);
        sendResponse({ id: newMemory.id });
        break;
      }

      case 'UPDATE_MEMORY': {
        const updated = await fieldMemoryRepository.update(
          message.id as string,
          message.data as UpdateFieldMemoryDto
        );
        sendResponse({ success: !!updated });
        break;
      }

      case 'DELETE_MEMORY': {
        const deleted = await fieldMemoryRepository.delete(message.id as string);
        sendResponse({ success: deleted });
        break;
      }

      case 'RECORD_USAGE': {
        await fieldMemoryRepository.recordUsage(message.id as string);
        sendResponse({ success: true });
        break;
      }

      case 'GET_NEXT_ALIAS': {
        const alias = await fieldMemoryRepository.getNextAlias(message.url as string);
        sendResponse({ alias });
        break;
      }

      case 'EXECUTE_AUTOFILL': {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { type: 'EXECUTE_AUTOFILL', memoryId: message.memoryId },
            (result: unknown) => {
              sendResponse(result);
            }
          );
        } else {
          sendResponse({ error: 'No active tab' });
        }
        break;
      }

      case 'GET_STATS': {
        const stats = await fieldMemoryRepository.getStats();
        sendResponse(stats);
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('[Form-ation] Error handling message:', error);
    sendResponse({ error: String(error) });
  }
}
