"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Braces } from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EmailTemplateRichEditor,
  type EmailTemplateRichEditorHandle,
} from "@/features/email-notifications/components/email-template-rich-editor";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  emailCategoryLabel,
  getEmailTemplate,
  listEmailTemplates,
  previewEmailTemplate,
  resetEmailTemplate,
  updateEmailTemplate,
  type EmailTemplateSummary,
  type EmailTypeCategory,
} from "@/features/email-notifications/api/email-notifications.api";
import { queryKeys } from "@/lib/query/keys";
import { useDirtyFormWarning } from "@/lib/forms/use-dirty-form-warning";

const CATEGORY_ORDER: EmailTypeCategory[] = [
  "membership",
  "appointments",
  "invoices",
  "auth",
];

type ContentMode = "edit" | "preview";

type SelectionRange = { start: number; end: number };

type OpenSection =
  | { kind: "category"; category: EmailTypeCategory }
  | { kind: "template"; category: EmailTypeCategory; emailType: string };

function emailVariableLabel(key: string): string {
  const raw = key.includes(".") ? key.split(".").slice(1).join(" ") : key;
  return raw
    .split(/[._]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function captureSelection(
  element: HTMLInputElement | HTMLTextAreaElement,
): SelectionRange {
  return {
    start: element.selectionStart ?? element.value.length,
    end: element.selectionEnd ?? element.value.length,
  };
}

function insertAtCursor(
  token: string,
  currentValue: string,
  setValue: (value: string) => void,
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  selectionRef: React.MutableRefObject<SelectionRange | null>,
) {
  const element = inputRef.current;
  let start: number;
  let end: number;

  if (
    element != null &&
    element === document.activeElement &&
    element.selectionStart != null
  ) {
    start = element.selectionStart;
    end = element.selectionEnd ?? start;
  } else if (selectionRef.current) {
    ({ start, end } = selectionRef.current);
  } else {
    start = currentValue.length;
    end = currentValue.length;
  }

  const nextValue =
    currentValue.slice(0, start) + token + currentValue.slice(end);
  setValue(nextValue);

  const cursor = start + token.length;
  requestAnimationFrame(() => {
    if (!element) return;
    element.focus();
    element.setSelectionRange(cursor, cursor);
    selectionRef.current = { start: cursor, end: cursor };
  });
}

type EmailTemplateVariablePickerProps = {
  variables: string[];
  onInsert: (key: string) => void;
  className?: string;
};

function EmailTemplateVariablePicker({
  variables,
  onInsert,
  className,
}: EmailTemplateVariablePickerProps) {
  if (variables.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className={cn("size-8 text-muted-foreground", className)}
            aria-label="Insert dynamic field"
          >
            <Braces className="size-[18px]" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="max-h-64 w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Insert variable</DropdownMenuLabel>
          {variables.map((key) => (
            <DropdownMenuItem
              key={key}
              onClick={() => onInsert(key)}
              className="flex flex-col items-start gap-0.5 py-2"
            >
              <span>
                {emailVariableLabel(key)}
                <span className="text-muted-foreground"> — </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {key}
                </span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type EmailTemplateEditorProps = {
  template: NonNullable<
    Awaited<ReturnType<typeof getEmailTemplate>>
  >;
  subject: string;
  htmlBody: string;
  contentMode: ContentMode;
  preview: {
    subject: string;
    htmlBody: string;
    textBody: string | null;
  } | null;
  isDirty: boolean;
  templateVariables: string[];
  subjectInputRef: React.RefObject<HTMLInputElement | null>;
  htmlBodyEditorRef: React.RefObject<EmailTemplateRichEditorHandle | null>;
  onSubjectChange: (value: string) => void;
  onHtmlBodyChange: (value: string) => void;
  onContentModeChange: (mode: string) => void;
  onInsertSubjectVariable: (key: string) => void;
  onInsertHtmlBodyVariable: (key: string) => void;
  onCaptureSubjectSelection: (
    event: React.SyntheticEvent<HTMLInputElement>,
  ) => void;
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
  isResetting: boolean;
  isPreviewLoading: boolean;
};

function EmailTemplateEditor({
  template,
  templateRevision,
  subject,
  htmlBody,
  contentMode,
  preview,
  isDirty,
  templateVariables,
  subjectInputRef,
  htmlBodyEditorRef,
  onSubjectChange,
  onHtmlBodyChange,
  onContentModeChange,
  onInsertSubjectVariable,
  onInsertHtmlBodyVariable,
  onCaptureSubjectSelection,
  onSave,
  onReset,
  isSaving,
  isResetting,
  isPreviewLoading,
}: EmailTemplateEditorProps & { templateRevision: string }) {
  return (
    <div className="space-y-4 pt-1">
      <div className="space-y-2">
        <Label htmlFor={`email-subject-${template.emailType}`}>Subject</Label>
        <div className="relative">
          <Input
            ref={subjectInputRef}
            id={`email-subject-${template.emailType}`}
            value={subject}
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
            />
          </div>

          <TabsContent value="edit" className="mt-0">
            <EmailTemplateRichEditor
              key={templateRevision}
              ref={htmlBodyEditorRef}
              id={`email-html-${template.emailType}`}
              value={htmlBody}
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

      <div className="flex items-center gap-4">
        {isDirty ? (
          <p className="text-sm text-amber-600 dark:text-amber-500">
            You have unsaved changes.
          </p>
        ) : null}
        <div className="ml-auto flex gap-2">
          <ActionButton onClick={onSave} disabled={isSaving || !isDirty}>
            Save template
          </ActionButton>
          <ActionButton
            variant="outline"
            onClick={onReset}
            disabled={isResetting}
          >
            Reset to default
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

export function EmailTemplatesTab() {
  const queryClient = useQueryClient();
  const [activeTemplateType, setActiveTemplateType] = useState<string | null>(
    null,
  );
  const [openSection, setOpenSection] = useState<OpenSection | null>(null);
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [contentMode, setContentMode] = useState<ContentMode>("edit");
  const [resetOpen, setResetOpen] = useState(false);
  const [unsavedSwitchOpen, setUnsavedSwitchOpen] = useState(false);
  const [pendingTemplateType, setPendingTemplateType] = useState<
    string | null
  >(null);
  const [preview, setPreview] = useState<{
    subject: string;
    htmlBody: string;
    textBody: string | null;
  } | null>(null);
  const [syncedTemplateRevision, setSyncedTemplateRevision] = useState<
    string | null
  >(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const htmlBodyEditorRef = useRef<EmailTemplateRichEditorHandle>(null);
  const subjectSelectionRef = useRef<SelectionRange | null>(null);
  const previousActiveTemplateTypeRef = useRef<string | null>(null);

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: queryKeys.emailNotifications.templates(),
    queryFn: listEmailTemplates,
  });

  const { data: template, isLoading } = useQuery({
    queryKey: queryKeys.emailNotifications.template(activeTemplateType ?? ""),
    queryFn: () => getEmailTemplate(activeTemplateType!),
    enabled: !!activeTemplateType,
  });

  const templateRevision = template
    ? `${template.emailType}:${template.updatedAt ?? "default"}:${template.isCustomized}`
    : null;

  if (previousActiveTemplateTypeRef.current !== activeTemplateType) {
    previousActiveTemplateTypeRef.current = activeTemplateType;
    if (syncedTemplateRevision !== null) {
      setSyncedTemplateRevision(null);
      setSubject("");
      setHtmlBody("");
      setPreview(null);
    }
  }

  if (template && templateRevision && syncedTemplateRevision !== templateRevision) {
    setSyncedTemplateRevision(templateRevision);
    setSubject(template.subject);
    setHtmlBody(template.htmlBody);
    setContentMode("edit");
    setPreview(null);
  }

  const isEditorReady =
    !!template &&
    !!templateRevision &&
    syncedTemplateRevision === templateRevision;

  const isDirty = useMemo(() => {
    if (!template) return false;
    return subject !== template.subject || htmlBody !== template.htmlBody;
  }, [template, subject, htmlBody]);

  useDirtyFormWarning(isDirty);

  const itemsByCategory = useMemo(() => {
    const grouped = new Map<EmailTypeCategory, EmailTemplateSummary[]>();

    for (const category of CATEGORY_ORDER) {
      const items = templates.filter((item) => item.category === category);
      if (items.length > 0) {
        grouped.set(category, items);
      }
    }

    return grouped;
  }, [templates]);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.emailNotifications.all(),
    });

  const saveMutation = useMutation({
    mutationFn: () =>
      updateEmailTemplate(activeTemplateType!, {
        subject,
        htmlBody,
      }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Template saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const previewMutation = useMutation({
    mutationFn: () =>
      previewEmailTemplate(activeTemplateType!, {
        subject,
        htmlBody,
      }),
    onSuccess: (result) => setPreview(result),
    onError: (e: Error) => toast.error(e.message),
  });

  const resetMutation = useMutation({
    mutationFn: () => resetEmailTemplate(activeTemplateType!),
    onSuccess: async () => {
      await invalidate();
      setResetOpen(false);
      toast.success("Template reset to default");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleContentModeChange = (mode: string) => {
    const nextMode = mode as ContentMode;
    setContentMode(nextMode);
    if (nextMode === "preview") {
      previewMutation.mutate();
    }
  };

  const applyTemplateChange = (
    nextType: string,
    category: EmailTypeCategory,
  ) => {
    setActiveTemplateType(nextType);
    setOpenSection({ kind: "template", emailType: nextType, category });
  };

  const handleCategoryAccordionChange = (value: string[]) => {
    const nextCategory = value[0] as EmailTypeCategory | undefined;

    if (!nextCategory) {
      setOpenSection(null);
      return;
    }

    setOpenSection({ kind: "category", category: nextCategory });
  };

  const handleTemplateAccordionChange = (
    category: EmailTypeCategory,
    value: string[],
  ) => {
    const nextType = value[0] ?? null;

    if (nextType == null) {
      if (
        openSection?.kind === "template" &&
        openSection.category === category
      ) {
        setOpenSection({ kind: "category", category });
      }
      return;
    }

    if (
      nextType === activeTemplateType &&
      openSection?.kind === "template" &&
      openSection.emailType === nextType
    ) {
      return;
    }

    if (isDirty && activeTemplateType != null && nextType !== activeTemplateType) {
      setPendingTemplateType(nextType);
      setUnsavedSwitchOpen(true);
      return;
    }

    applyTemplateChange(nextType, category);
  };

  const confirmDiscardAndSwitch = () => {
    if (!pendingTemplateType) {
      setUnsavedSwitchOpen(false);
      return;
    }

    const category = templates.find(
      (item) => item.emailType === pendingTemplateType,
    )?.category;

    if (category) {
      applyTemplateChange(pendingTemplateType, category);
    }

    setPendingTemplateType(null);
    setUnsavedSwitchOpen(false);
  };

  const templateVariables = template?.variables ?? [];

  const insertSubjectVariable = (key: string) => {
    insertAtCursor(
      `{{${key}}}`,
      subject,
      setSubject,
      subjectInputRef,
      subjectSelectionRef,
    );
  };

  const insertHtmlBodyVariable = (key: string) => {
    htmlBodyEditorRef.current?.insertContent(`{{${key}}}`);
  };

  const captureSubjectSelection = (
    event: React.SyntheticEvent<HTMLInputElement>,
  ) => {
    subjectSelectionRef.current = captureSelection(event.currentTarget);
  };

  if (templatesLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading templates…</p>
    );
  }

  if (templates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No email templates available.</p>
    );
  }

  const visibleCategories = CATEGORY_ORDER.filter((category) =>
    itemsByCategory.has(category),
  );

  return (
    <>
      <Accordion
        value={openSection ? [openSection.category] : []}
        onValueChange={handleCategoryAccordionChange}
        className="rounded-lg border px-4"
      >
        {visibleCategories.map((category) => {
          const categoryItems = itemsByCategory.get(category) ?? [];
          const customizedCount = categoryItems.filter(
            (item) => item.isCustomized,
          ).length;
          const categoryActiveTemplate =
            openSection?.kind === "template" &&
            openSection.category === category
              ? [openSection.emailType]
              : [];

          return (
            <AccordionItem key={category} value={category}>
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex flex-1 flex-col items-start gap-0.5 pr-2 text-left sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium">
                    {emailCategoryLabel(category)}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {customizedCount > 0
                      ? `${customizedCount} of ${categoryItems.length} customized`
                      : `${categoryItems.length} template${categoryItems.length === 1 ? "" : "s"}`}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <Accordion
                  value={categoryActiveTemplate}
                  onValueChange={(value) =>
                    handleTemplateAccordionChange(
                      category,
                      value as string[],
                    )
                  }
                  className="rounded-lg border px-3"
                >
                  {categoryItems.map((item) => {
                    const isLoadedTemplate =
                      activeTemplateType === item.emailType;

                    return (
                      <AccordionItem key={item.emailType} value={item.emailType}>
                        <AccordionTrigger className="py-3 hover:no-underline">
                          <div className="flex flex-1 flex-col items-start gap-1 pr-2 text-left">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{item.label}</span>
                              {item.isCustomized ? (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px]"
                                >
                                  Custom
                                </Badge>
                              ) : null}
                            </div>
                            <p className="line-clamp-2 text-sm font-normal text-muted-foreground">
                              {item.description}
                            </p>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          {isLoadedTemplate ? (
                            isLoading || !isEditorReady || !template ? (
                              <p className="text-sm text-muted-foreground">
                                Loading template…
                              </p>
                            ) : (
                              <EmailTemplateEditor
                                template={template}
                                templateRevision={templateRevision!}
                                subject={subject}
                                htmlBody={htmlBody}
                                contentMode={contentMode}
                                preview={preview}
                                isDirty={isDirty}
                                templateVariables={templateVariables}
                                subjectInputRef={subjectInputRef}
                                htmlBodyEditorRef={htmlBodyEditorRef}
                                onSubjectChange={setSubject}
                                onHtmlBodyChange={setHtmlBody}
                                onContentModeChange={handleContentModeChange}
                                onInsertSubjectVariable={insertSubjectVariable}
                                onInsertHtmlBodyVariable={
                                  insertHtmlBodyVariable
                                }
                                onCaptureSubjectSelection={
                                  captureSubjectSelection
                                }
                                onSave={() => saveMutation.mutate()}
                                onReset={() => setResetOpen(true)}
                                isSaving={saveMutation.isPending}
                                isResetting={resetMutation.isPending}
                                isPreviewLoading={previewMutation.isPending}
                              />
                            )
                          ) : null}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <AlertDialog
        open={unsavedSwitchOpen}
        onOpenChange={(open) => {
          setUnsavedSwitchOpen(open);
          if (!open) setPendingTemplateType(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this template. Switch templates
              anyway? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDiscardAndSwitch}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the default subject and body for this email type.
              Your customizations will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
            >
              Reset template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
