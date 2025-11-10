/**
 * 자동 입력 실행 클래스
 * 필드에 값을 채우고 이벤트를 발생시키는 역할만 담당
 */

import type { FieldData, AutoFillResult } from '../types/fieldMemory';

export class AutoFillExecutor {
  /**
   * 필드 데이터 배열로 자동 입력 실행
   */
  async execute(fields: FieldData[]): Promise<AutoFillResult> {
    let filledCount = 0;
    let failedCount = 0;
    const failedFields: string[] = [];

    for (const field of fields) {
      const element = document.querySelector(field.selector) as HTMLElement;

      if (element && this.isInputElement(element)) {
        try {
          await this.fillField(element, field.value);
          filledCount++;
          console.log('[AutoFillExecutor] 필드 입력 성공:', field.label);
        } catch (error) {
          failedCount++;
          failedFields.push(field.selector);
          console.warn('[AutoFillExecutor] 필드 입력 실패:', field.label, error);
        }
      } else {
        failedCount++;
        failedFields.push(field.selector);
      }
    }

    const result: AutoFillResult = {
      success: failedCount === 0,
      filledCount,
      failedCount,
      failedFields,
      message: failedCount > 0
        ? `${filledCount}개 성공, ${failedCount}개 실패`
        : `${filledCount}개 필드 모두 성공`,
    };

    return result;
  }

  /**
   * 개별 필드에 값 입력
   */
  private async fillField(element: HTMLElement, value: string): Promise<void> {
    const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

    // 1. 포커스
    element.focus();

    // 2. 값 설정
    if (input instanceof HTMLSelectElement) {
      await this.fillSelectElement(input, value);
    } else {
      input.value = value;
    }

    // 3. 이벤트 발생 (React 등 프레임워크 호환)
    this.triggerInputEvents(element);

    // 4. 시각적 피드백
    this.highlightFilledField(element);
  }

  /**
   * Select 요소 채우기
   */
  private async fillSelectElement(select: HTMLSelectElement, value: string): Promise<void> {
    // 정확한 값 매칭 시도
    for (const option of Array.from(select.options)) {
      if (option.value === value || option.textContent === value) {
        select.value = option.value;
        return;
      }
    }

    // 부분 매칭 시도
    for (const option of Array.from(select.options)) {
      if (option.textContent?.includes(value) || value.includes(option.textContent || '')) {
        select.value = option.value;
        return;
      }
    }

    throw new Error('매칭되는 옵션을 찾을 수 없음');
  }

  /**
   * 입력 이벤트 발생 (프레임워크 호환)
   */
  private triggerInputEvents(element: HTMLElement): void {
    const events = ['input', 'change', 'blur'];

    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true });
      element.dispatchEvent(event);
    });
  }

  /**
   * 입력된 필드 하이라이트
   */
  private highlightFilledField(element: HTMLElement): void {
    const originalOutline = element.style.outline;
    element.style.outline = '2px solid #28a745';
    element.style.outlineOffset = '1px';

    setTimeout(() => {
      element.style.outline = originalOutline;
      element.style.outlineOffset = '';
    }, 2000);
  }

  /**
   * 입력 요소인지 확인
   */
  private isInputElement(element: HTMLElement): boolean {
    return element instanceof HTMLInputElement ||
           element instanceof HTMLTextAreaElement ||
           element instanceof HTMLSelectElement;
  }
}
