"use client";

import { useMemo } from "react";
import { Bot, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SnapshotPreviewPanel } from "@/features/platform/components/snapshot-preview-panel";
import { createEntityLabelResolver } from "@/lib/snapshot/resolve-terminology";
import { useSnapshotEditorAssets } from "@/features/platform/hooks/use-snapshot-editor";
import { buildSnapshotContextPreview } from "@/features/platform/schemas/snapshot-form";
import { SNAPSHOT_ENTITIES } from "@/lib/config/snapshot/entity-label-registry";

export function PreviewCenterBuilder() {
  const assets = useSnapshotEditorAssets();
  const context = useMemo(() => buildSnapshotContextPreview(assets), [assets]);
  const tEntity = useMemo(
    () => createEntityLabelResolver(context.terminology),
    [context.terminology],
  );

  const entityExamples = useMemo(
    () =>
      SNAPSHOT_ENTITIES.slice(0, 4).map((entity) => ({
        entity,
        label: tEntity(entity, "add_new_item", "Add New Item"),
      })),
    [tEntity],
  );

  const firstChatbot = assets.chatbots?.[0];
  const branding = assets.branding ?? {};

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Full preview of how this blueprint will feel to business users and
        customers. Changes in other tabs update here automatically.
      </p>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <SnapshotPreviewPanel assets={assets} expanded />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Entity label examples</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {entityExamples.map(({ entity, label }) => (
              <div key={entity} className="flex justify-between gap-2">
                <span className="text-muted-foreground capitalize">{entity}</span>
                <span className="font-medium">{label}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="size-4" />
              Booking header
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="rounded-md border p-3"
              style={{
                borderTopColor: branding.accentColor ?? "#6366f1",
                borderTopWidth: 3,
              }}
            >
              <p className="font-semibold">
                {branding.publicPageTitle ??
                  branding.productName ??
                  context.snapshotName}
              </p>
              <p className="text-xs text-muted-foreground">
                {context.terminology["actions.bookAppointment"] ??
                  "Book appointment"}
              </p>
            </div>
          </CardContent>
        </Card>

        {firstChatbot ? (
          <Card className="lg:col-span-2 xl:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bot className="size-4" />
                {firstChatbot.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div
                className="rounded-lg border p-3"
                style={{
                  borderColor: branding.accentColor ?? "#6366f1",
                }}
              >
                <p className="text-xs font-medium">{firstChatbot.name}</p>
                <p className="mt-1 text-muted-foreground">
                  {firstChatbot.rules?.[0]?.response ??
                    "Hi! How can I help you today?"}
                </p>
              </div>
              {(firstChatbot.rules ?? []).slice(0, 3).map((rule) => (
                <div key={rule.sourceKey} className="rounded-md bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground">
                    If: &quot;{rule.trigger}&quot;
                  </p>
                  <p>{rule.response}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bot className="size-4" />
                Chatbot widget
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No chatbots configured. Add one in the Chatbots tab to preview the
                widget here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
