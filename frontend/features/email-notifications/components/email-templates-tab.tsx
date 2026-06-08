"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
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
  EmailTemplateEditorPanel,
  type EmailTemplateContentMode,
} from "@/features/email-notifications/components/email-template-editor-panel";
import type { EmailTemplateRichEditorHandle } from "@/features/email-notifications/components/email-template-rich-editor";
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
import {
  captureSelection,
  insertAtCursor,
  type SelectionRange,
} from "@/features/email-notifications/utils/email-template-editor-utils";
import { queryKeys } from "@/lib/query/keys";
import { useDirtyFormWarning } from "@/lib/forms/use-dirty-form-warning";

const CATEGORY_ORDER: EmailTypeCategory[] = [
  "membership",
  "appointments",
  "invoices",
  "auth",
];

type OpenSection =
  | { kind: "category"; category: EmailTypeCategory }
  | { kind: "template"; category: EmailTypeCategory; emailType: string };

export function EmailTemplatesTab() {
  const queryClient = useQueryClient();
  const [activeTemplateType, setActiveTemplateType] = useState<string | null>(
    null,
  );
  const [openSection, setOpenSection] = useState<OpenSection | null>(null);
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [contentMode, setContentMode] = useState<EmailTemplateContentMode>(
    "edit",
  );
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
    const nextMode = mode as EmailTemplateContentMode;
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
                              <EmailTemplateEditorPanel
                                emailType={template.emailType}
                                subject={subject}
                                htmlBody={htmlBody}
                                contentMode={contentMode}
                                preview={preview}
                                templateVariables={templateVariables}
                                editorKey={templateRevision!}
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
                                isPreviewLoading={previewMutation.isPending}
                                footer={
                                  <div className="flex items-center gap-4">
                                    {isDirty ? (
                                      <p className="text-sm text-amber-600 dark:text-amber-500">
                                        You have unsaved changes.
                                      </p>
                                    ) : null}
                                    <div className="ml-auto flex gap-2">
                                      <ActionButton
                                        onClick={() => saveMutation.mutate()}
                                        disabled={
                                          saveMutation.isPending || !isDirty
                                        }
                                      >
                                        Save template
                                      </ActionButton>
                                      <ActionButton
                                        variant="outline"
                                        onClick={() => setResetOpen(true)}
                                        disabled={resetMutation.isPending}
                                      >
                                        Reset to default
                                      </ActionButton>
                                    </div>
                                  </div>
                                }
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
