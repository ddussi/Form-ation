/**
 * 폼 감지 서비스: 페이지의 폼들을 감지하고 관리
 */

import { detectForms } from '../../../features/form-detection';
import type { FormInfo } from '../../../shared/types';

export class FormDetectionService {
  private detectedForms: FormInfo[] = [];

  async detectForms(): Promise<FormInfo[]> {
    this.detectedForms = detectForms();
    
    console.log(`[FormDetectionService] ${this.detectedForms.length}개 폼 감지됨:`);
    this.detectedForms.forEach((form, index) => {
      console.log(`  폼 ${index + 1}:`, {
        formElement: form.formElement ? 'form 태그' : '페이지 전체',
        fieldCount: form.fields.length,
        signature: form.signature,
        fields: form.fields.map(f => ({ name: f.name, type: f.type }))
      });
    });

    return this.detectedForms;
  }

  getDetectedForms(): FormInfo[] {
    return this.detectedForms;
  }
}
