"use client";

import { useMemo, useRef, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import {
  EmailTemplateEditorPanel,
  type EmailTemplateContentMode,
} from "@/features/email-notifications/components/email-template-editor-panel";
import type { EmailTemplateRichEditorHandle } from "@/features/email-notifications/components/email-template-rich-editor";
import {
  EMAIL_TYPE_CATEGORY_ORDER,
  getConfigurableEmailTypeDefinition,
  listConfigurableEmailTypes,
  type EmailTypeDefinition,
} from "@/features/email-notifications/constants/email-type-registry";
import { emailCategoryLabel } from "@/features/email-notifications/api/email-notifications.api";
import {
  captureSelection,
  insertAtCursor,
  type SelectionRange,
} from "@/features/email-notifications/utils/email-template-editor-utils";
import { previewEmailTemplateContent } from "@/features/email-notifications/utils/email-template-preview";
import type { SnapshotEmailTemplateAsset } from "@/features/platform/types/snapshot";

type OpenSection =
  | { kind: "category"; category: EmailTypeDefinition["category"] }
  | {
      kind: "template";
      category: EmailTypeDefinition["category"];
      emailType: string;
    };

type SnapshotEmailTemplatesSectionProps = {
  templates: SnapshotEmailTemplateAsset[];
  canManage: boolean;
  onUpdateTemplate: (
    emailType: string,
    patch: { subject?: string; htmlBody?: string },
  ) => void;
  onResetTemplate: (emailType: string) => void;
};

function getSavedTemplate(
  templates: SnapshotEmailTemplateAsset[],
  emailType: string,
) {
  return templates.find((template) => template.emailType === emailType);
}

function getEffectiveTemplate(
  templates: SnapshotEmailTemplateAsset[],
  emailType: string,
) {
  const definition = getConfigurableEmailTypeDefinition(emailType);
  if (!definition) return null;

  const saved = getSavedTemplate(templates, emailType);
  return {
    ...definition,
    emailType,
    subject: saved?.subject ?? definition.defaultSubject,
    htmlBody: saved?.htmlBody ?? definition.defaultHtmlBody,
    isCustomized: saved != null,
  };
}

export function SnapshotEmailTemplatesSection({
  templates,
  canManage,
  onUpdateTemplate,
  onResetTemplate,
}: SnapshotEmailTemplatesSectionProps) {
  const [activeTemplateType, setActiveTemplateType] = useState<string | null>(
    null,
  );
  const [openSection, setOpenSection] = useState<OpenSection | null>(null);
  const [contentMode, setContentMode] = useState<EmailTemplateContentMode>(
    "edit",
  );
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmailType, setResetEmailType] = useState<string | null>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const htmlBodyEditorRef = useRef<EmailTemplateRichEditorHandle>(null);
  const subjectSelectionRef = useRef<SelectionRange | null>(null);

  const itemsByCategory = useMemo(() => {
    const grouped = new Map<
      EmailTypeDefinition["category"],
      EmailTypeDefinition[]
    >();

    for (const category of EMAIL_TYPE_CATEGORY_ORDER) {
      const items = listConfigurableEmailTypes().filter(
        (item) => item.category === category,
      );
      if (items.length > 0) {
        grouped.set(category, items);
      }
    }

    return grouped;
  }, []);

  const activeTemplate = activeTemplateType
    ? getEffectiveTemplate(templates, activeTemplateType)
    : null;

  const preview =
    activeTemplate && contentMode === "preview"
      ? previewEmailTemplateContent(
          activeTemplate.emailType,
          activeTemplate.subject,
          activeTemplate.htmlBody,
        )
      : null;

  const applyTemplateChange = (
    nextType: string,
    category: EmailTypeDefinition["category"],
  ) => {
    setActiveTemplateType(nextType);
    setOpenSection({ kind: "template", emailType: nextType, category });
    setContentMode("edit");
  };

  const handleCategoryAccordionChange = (value: string[]) => {
    const nextCategory = value[0] as
      | EmailTypeDefinition["category"]
      | undefined;

    if (!nextCategory) {
      setOpenSection(null);
      return;
    }

    setOpenSection({ kind: "category", category: nextCategory });
  };

  const handleTemplateAccordionChange = (
    category: EmailTypeDefinition["category"],
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

    applyTemplateChange(nextType, category);
  };

  const handleContentModeChange = (mode: string) => {
    setContentMode(mode as EmailTemplateContentMode);
  };

  const insertSubjectVariable = (key: string) => {
    if (!activeTemplate) return;
    insertAtCursor(
      `{{${key}}}`,
      activeTemplate.subject,
      (value) => onUpdateTemplate(activeTemplate.emailType, { subject: value }),
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

  const confirmReset = () => {
    if (!resetEmailType) return;
    onResetTemplate(resetEmailType);
    setResetOpen(false);
    setResetEmailType(null);
    setContentMode("edit");
  };

  const visibleCategories = EMAIL_TYPE_CATEGORY_ORDER.filter((category) =>
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
            (item) => getSavedTemplate(templates, item.key) != null,
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
                    const isActiveTemplate = activeTemplateType === item.key;
                    const effectiveTemplate = getEffectiveTemplate(
                      templates,
                      item.key,
                    );

                    return (
                      <AccordionItem key={item.key} value={item.key}>
                        <AccordionTrigger className="py-3 hover:no-underline">
                          <div className="flex flex-1 flex-col items-start gap-1 pr-2 text-left">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{item.label}</span>
                              {effectiveTemplate?.isCustomized ? (
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
                          {isActiveTemplate && effectiveTemplate ? (
                            <EmailTemplateEditorPanel
                              emailType={effectiveTemplate.emailType}
                              subject={effectiveTemplate.subject}
                              htmlBody={effectiveTemplate.htmlBody}
                              contentMode={contentMode}
                              preview={preview}
                              templateVariables={effectiveTemplate.variables}
                              editorKey={effectiveTemplate.emailType}
                              disabled={!canManage}
                              subjectInputRef={subjectInputRef}
                              htmlBodyEditorRef={htmlBodyEditorRef}
                              onSubjectChange={(value) =>
                                onUpdateTemplate(effectiveTemplate.emailType, {
                                  subject: value,
                                })
                              }
                              onHtmlBodyChange={(value) =>
                                onUpdateTemplate(effectiveTemplate.emailType, {
                                  htmlBody: value,
                                })
                              }
                              onContentModeChange={handleContentModeChange}
                              onInsertSubjectVariable={insertSubjectVariable}
                              onInsertHtmlBodyVariable={insertHtmlBodyVariable}
                              onCaptureSubjectSelection={
                                captureSubjectSelection
                              }
                              footer={
                                <div className="flex justify-end">
                                  <ActionButton
                                    variant="outline"
                                    disabled={
                                      !canManage ||
                                      !effectiveTemplate.isCustomized
                                    }
                                    onClick={() => {
                                      setResetEmailType(
                                        effectiveTemplate.emailType,
                                      );
                                      setResetOpen(true);
                                    }}
                                  >
                                    Reset to default
                                  </ActionButton>
                                </div>
                              }
                            />
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

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the default subject and body for this email type.
              Your snapshot customizations will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReset}>Reset template</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
