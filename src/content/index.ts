import type { FieldMemory, AutoFillResult } from '../types';
import { autoFiller, fieldMatcher } from '../core';
import { toast } from '../ui';
import { selectorMode } from './SelectorMode';
import { fieldObserver } from './FieldObserver';

declare const globalThis: { __formationInitialized?: boolean };

class ContentManager {
  private initialized = false;

  constructor() {
    if (globalThis.__formationInitialized) return;
    globalThis.__formationInitialized = true;
    this.init();
  }

  private init(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.setupMessageListener();
    this.checkForSavedMemories();
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener(
      (
        message: unknown,
        _sender: unknown,
        sendResponse: (response?: unknown) => void
      ): boolean => {
        this.handleMessage(message as { type: string; [key: string]: unknown }, sendResponse);
        return true; // 비동기 응답을 위해 true 반환
      }
    );
  }

  private async handleMessage(
    message: { type: string; [key: string]: unknown },
    sendResponse: (response: unknown) => void
  ): Promise<void> {
    switch (message.type) {
      case 'ACTIVATE_SELECTOR_MODE':
        await this.activateSelectorMode();
        sendResponse({ success: true });
        break;

      case 'EXECUTE_AUTOFILL':
        const result = await this.executeAutoFill(message.memoryId as string);
        sendResponse(result);
        break;

      case 'CHECK_FIELD_MATCH':
        const fields = message.fields as { selector: string; type: string }[];
        const matchCount = fieldMatcher.countMatches(fields as any);
        sendResponse({ matchCount });
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  private async activateSelectorMode(): Promise<void> {
    if (selectorMode.isActivated()) {
      toast.warning('이미 선택 모드가 활성화되어 있습니다.');
      return;
    }

    const result = await selectorMode.activate();

    if (result.saved && result.fields.length > 0) {
      this.sendMessage(
        {
          type: 'SAVE_MEMORY',
          data: {
            url: window.location.href,
            alias: result.alias,
            fields: result.fields,
          },
        },
        (response: { id?: string } | undefined) => {
          if (response?.id) {
            toast.success(`"${result.alias}" 저장 완료 (${result.fields.length}개 필드)`);
          } else {
            toast.error('저장에 실패했습니다.');
          }
        }
      );
    } else if (!result.saved) {
      toast.info('선택이 취소되었습니다.');
    }
  }

  private async executeAutoFill(memoryId: string): Promise<AutoFillResult> {
    return new Promise((resolve) => {
      this.sendMessage(
        { type: 'GET_MEMORY_BY_ID', id: memoryId },
        (memory: FieldMemory | null) => {
          if (!memory) {
            resolve({
              totalCount: 0,
              filledCount: 0,
              skippedCount: 0,
              skippedSelectors: [],
            });
            return;
          }

          const result = autoFiller.execute(memory.fields);

          this.sendMessage({ type: 'RECORD_USAGE', id: memoryId });

          if (result.filledCount > 0) {
            toast.success(`${result.filledCount}개 필드 자동 입력 완료`);
          } else {
            toast.warning('매칭되는 필드가 없습니다.');
          }

          resolve(result);
        }
      );
    });
  }

  private checkForSavedMemories(): void {
    this.sendMessage(
      { type: 'GET_MEMORIES_FOR_URL', url: window.location.href },
      (memories: FieldMemory[]) => {
        if (!memories || memories.length === 0) return;

        const allFields = memories.flatMap((m) => m.fields);

        if (allFields.length > 0) {
          fieldObserver.start(allFields, () => {});
        }
      },
      true
    );
  }

  private sendMessage<T>(
    message: Record<string, unknown>,
    callback?: (response: T) => void,
    silent = false
  ): void {
    try {
      chrome.runtime.sendMessage(message, (response: T) => {
        if (chrome.runtime.lastError) {
          if (!silent) {
            toast.error('페이지를 새로고침해주세요.');
          }
          return;
        }
        callback?.(response);
      });
    } catch {
      if (!silent) {
        toast.error('페이지를 새로고침해주세요.');
      }
    }
  }
}

new ContentManager();
