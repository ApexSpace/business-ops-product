import { Injectable } from '@nestjs/common';
import { assertEmailType } from '../email-type.registry';

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class EmailTemplateRendererService {
  extractVariables(template: string): string[] {
    const found = new Set<string>();
    for (const match of template.matchAll(VARIABLE_PATTERN)) {
      if (match[1]) {
        found.add(match[1]);
      }
    }
    return [...found];
  }

  validateTemplateVariables(
    emailType: string,
    subject: string,
    htmlBody: string,
    textBody?: string | null,
  ): void {
    const def = assertEmailType(emailType);
    const allowed = new Set(def.variables);
    const used = [
      ...this.extractVariables(subject),
      ...this.extractVariables(htmlBody),
      ...(textBody ? this.extractVariables(textBody) : []),
    ];

    for (const variable of used) {
      if (!allowed.has(variable)) {
        throw new Error(`Invalid template variable: ${variable}`);
      }
    }
  }

  render(
    template: string,
    variables: Record<string, string>,
    options?: { escapeHtml?: boolean },
  ): string {
    return template.replace(VARIABLE_PATTERN, (_match, key: string) => {
      const value = variables[key] ?? '';
      return options?.escapeHtml ? escapeHtml(value) : value;
    });
  }

  renderEmailContent(params: {
    emailType: string;
    subject: string;
    htmlBody: string;
    textBody?: string | null;
    variables: Record<string, string>;
  }): { subject: string; htmlBody: string; textBody: string | null } {
    this.validateTemplateVariables(
      params.emailType,
      params.subject,
      params.htmlBody,
      params.textBody,
    );

    return {
      subject: this.render(params.subject, params.variables),
      htmlBody: this.render(params.htmlBody, params.variables, {
        escapeHtml: true,
      }),
      textBody: params.textBody
        ? this.render(params.textBody, params.variables)
        : null,
    };
  }
}
