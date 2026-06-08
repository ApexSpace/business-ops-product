"use client";

import type { ReactNode, RefObject, SyntheticEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EmailTemplateRichEditor,
  type EmailTemplateRichEditorHandle,
} from "@/features/email-notifications/components/email-template-rich-editor";
import { EmailTemplateVariablePicker } from "@/features/email-notifications/components/email-template-variable-picker";

export type EmailTemplateContentMode = "edit" | "preview";

type EmailTemplateEditorPanelProps = {
  emailType: string;
  subject: string;
  htmlBody: string;
  contentMode: EmailTemplateContentMode;
  preview: {
    subject: string;
    htmlBody: string;
    textBody?: string | null;
  } | null;
  templateVariables: string[];
  editorKey: string;
  disabled?: boolean;
  subjectInputRef: RefObject<HTMLInputElement | null>;
  htmlBodyEditorRef: RefObject<EmailTemplateRichEditorHandle | null>;
  onSubjectChange: (value: string) => void;
  onHtmlBodyChange: (value: string) => void;
  onContentModeChange: (mode: string) => void;
  onInsertSubjectVariable: (key: string) => void;
  onInsertHtmlBodyVariable: (key: string) => void;
  onCaptureSubjectSelection: (
    event: SyntheticEvent<HTMLInputElement>,
  ) => void;
  isPreviewLoading?: boolean;
  footer?: ReactNode;
};

export function EmailTemplateEditorPanel({
  emailType,
  subject,
  htmlBody,
  contentMode,
  preview,
  templateVariables,
  editorKey,
  disabled,
  subjectInputRef,
  htmlBodyEditorRef,
  onSubjectChange,
  onHtmlBodyChange,
  onContentModeChange,
  onInsertSubjectVariable,
  onInsertHtmlBodyVariable,
  onCaptureSubjectSelection,
  isPreviewLoading,
  footer,
}: EmailTemplateEditorPanelProps) {
  return (
    <div className="space-y-4 pt-1">
      <div className="space-y-2">
        <Label htmlFor={`email-subject-${emailType}`}>Subject</Label>
        <div className="relative">
          <Input
            ref={subjectInputRef}
            id={`email-subject-${emailType}`}
            value={subject}
            disabled={disabled}
            onChange={(e) => onSubjectChange(e.target.value)}
            onSelect={onCaptureSubjectSelection}
            onClick={onCaptureSubjectSelection}
            onKeyUp={onCaptureSubjectSelection}
            onBlur={onCaptureSubjectSelection}
            className="bg-background pr-12"
          />
          <div className="absolute top-1/2 right-3 -translate-y-1/2">
            <EmailTemplateVariablePicker
              variables={templateVariables}
              onInsert={onInsertSubjectVariable}
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-background">
        <Tabs value={contentMode} onValueChange={onContentModeChange}>
          <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
            <TabsList className="h-8">
              <TabsTrigger value="edit">HTML body</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <EmailTemplateVariablePicker
              variables={templateVariables}
              onInsert={onInsertHtmlBodyVariable}
              disabled={disabled}
            />
          </div>

          <TabsContent value="edit" className="mt-0">
            <EmailTemplateRichEditor
              key={editorKey}
              ref={htmlBodyEditorRef}
              id={`email-html-${emailType}`}
              value={htmlBody}
              disabled={disabled}
              onChange={onHtmlBodyChange}
            />
          </TabsContent>

          <TabsContent value="preview" className="mt-0">
            {isPreviewLoading ? (
              <p className="p-4 text-sm text-muted-foreground">
                Loading preview…
              </p>
            ) : preview ? (
              <div className="space-y-3 p-4">
                <p className="text-sm">
                  <span className="text-muted-foreground">Subject:</span>{" "}
                  {preview.subject}
                </p>
                <div
                  className="prose prose-sm max-w-none rounded-md border bg-background p-4"
                  dangerouslySetInnerHTML={{ __html: preview.htmlBody }}
                />
              </div>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">
                Preview unavailable.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {footer}
    </div>
  );
}
