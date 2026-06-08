"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { EMAIL_TYPE_OPTIONS } from "@/features/email-notifications/api/email-notifications.api";
import { getConfigurableEmailTypeDefinition } from "@/features/email-notifications/constants/email-type-registry";
import { SnapshotEmailTemplatesSection } from "@/features/platform/components/snapshot-builders/snapshot-email-templates-section";
import { useSnapshotEditor } from "@/features/platform/hooks/use-snapshot-editor";
import { useMemo } from "react";

export function EmailsBuilder() {
  const { assets, updateAssets, canManage } = useSnapshotEditor();
  const emails = assets?.emails ?? { preferences: [], templates: [] };

  const preferenceMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const pref of emails.preferences ?? []) {
      map.set(pref.emailType, pref.enabled);
    }
    return map;
  }, [emails.preferences]);

  const setPreference = (emailType: string, enabled: boolean) => {
    const prefs = [...(emails.preferences ?? [])];
    const index = prefs.findIndex((p) => p.emailType === emailType);
    if (index >= 0) {
      prefs[index] = { emailType, enabled };
    } else {
      prefs.push({ emailType, enabled });
    }
    updateAssets({ emails: { ...emails, preferences: prefs } });
  };

  const updateTemplate = (
    emailType: string,
    patch: { subject?: string; htmlBody?: string },
  ) => {
    const definition = getConfigurableEmailTypeDefinition(emailType);
    const templates = [...(emails.templates ?? [])];
    const index = templates.findIndex((t) => t.emailType === emailType);
    const existing = index >= 0 ? templates[index] : null;
    const next = {
      emailType,
      subject:
        patch.subject ??
        existing?.subject ??
        definition?.defaultSubject ??
        "",
      htmlBody:
        patch.htmlBody ??
        existing?.htmlBody ??
        definition?.defaultHtmlBody ??
        "",
    };

    if (index >= 0) {
      templates[index] = next;
    } else {
      templates.push(next);
    }
    updateAssets({ emails: { ...emails, templates } });
  };

  const resetTemplate = (emailType: string) => {
    const templates = (emails.templates ?? []).filter(
      (template) => template.emailType !== emailType,
    );
    updateAssets({ emails: { ...emails, templates } });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Notification preferences</CardTitle>
          <CardDescription>
            Choose which automated emails are enabled by default for new businesses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EMAIL_TYPE_OPTIONS.map((option) => (
              <div
                key={option.value}
                className="flex items-center justify-between gap-2 rounded-md border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {option.value}
                  </p>
                </div>
                <Switch
                  checked={preferenceMap.get(option.value) ?? true}
                  disabled={!canManage}
                  onCheckedChange={(checked) =>
                    setPreference(option.value, checked)
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email templates</CardTitle>
          <CardDescription>
            Customize subject lines and message content. Use variables for dynamic
            values—they will be replaced when emails are sent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SnapshotEmailTemplatesSection
            templates={emails.templates ?? []}
            canManage={canManage}
            onUpdateTemplate={updateTemplate}
            onResetTemplate={resetTemplate}
          />
        </CardContent>
      </Card>
    </div>
  );
}
