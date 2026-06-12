import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RootConfig } from '@app/core/config/configuration';

@Injectable()
export class FormWidgetPageService {
  constructor(private readonly config: ConfigService<RootConfig, true>) {}

  renderWidgetPage(publicKey: string): string {
    const backendPublicUrl = this.config.get('app.backendPublicUrl', {
      infer: true,
    });
    const apiPrefix = this.config.get('app.apiPrefix', { infer: true });
    const apiBase = `${backendPublicUrl.replace(/\/$/, '')}/${apiPrefix.replace(/^\//, '')}`;
    const widgetBase = backendPublicUrl.replace(/\/$/, '');
    const escapedKey = this.escapeHtml(publicKey);
    const escapedApi = this.escapeHtml(apiBase);
    const escapedWidgetBase = this.escapeHtml(widgetBase);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Form</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: transparent; color: #111827; line-height: 1.5; }
    #root { padding: 16px; }
    #status { text-align: center; padding: 32px 16px; color: #6b7280; font-size: 14px; }
    .form-wrap { margin: 0 auto; width: 100%; }
    .form-header { margin-bottom: 24px; }
    .form-header h2 { margin: 0 0 8px; font-size: 1.5rem; font-weight: 600; }
    .form-header p { margin: 0; font-size: 0.875rem; color: #6b7280; }
    .field { margin-bottom: 16px; }
    .field label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 6px; }
    .field input, .field textarea, .field select { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #fff; color: inherit; }
    .field textarea { min-height: 96px; resize: vertical; }
    .field .help { margin-top: 4px; font-size: 12px; color: #6b7280; }
    .field .req { color: #dc2626; }
    .field.has-error input, .field.has-error textarea, .field.has-error select { border-color: #dc2626; }
    .field-error { margin-top: 4px; font-size: 12px; color: #dc2626; min-height: 1em; }
    .form-error { margin-bottom: 12px; padding: 10px 12px; border-radius: 8px; background: #fef2f2; color: #b91c1c; font-size: 14px; }
    .layout-heading { margin: 20px 0 8px; font-weight: 600; }
    .layout-paragraph { margin: 0 0 12px; color: #374151; font-size: 14px; }
    .checkbox-row, .radio-row { display: flex; align-items: flex-start; gap: 8px; font-size: 14px; margin-bottom: 8px; }
    .checkbox-row input, .radio-row input { width: auto; margin-top: 3px; }
    .submit-row { margin-top: 24px; display: flex; }
    .submit-row.left { justify-content: flex-start; }
    .submit-row.center { justify-content: center; }
    .submit-row.right { justify-content: flex-end; }
    button.submit { border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; color: #fff; background: var(--form-accent, #6366f1); }
    button.submit.full { width: 100%; }
    button.submit:disabled { opacity: 0.7; cursor: not-allowed; }
    .success { text-align: center; padding: 32px 16px; }
    .success h3 { margin: 0 0 8px; font-size: 1.125rem; }
  </style>
</head>
<body>
  <div id="root"><div id="status">Loading form…</div></div>
  <script src="${escapedWidgetBase}/widgets/form-embed-runtime.js"></script>
  <script>
    window.FormEmbed.init({
      publicKey: "${escapedKey}",
      apiBase: "${escapedApi}",
    });
  </script>
</body>
</html>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
