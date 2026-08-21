"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listIntegrationResources } from "@/features/integrations/api/integrations.api";
import { usePlatformSchemas } from "@/features/social-planner/hooks/use-platform-schemas";
import { useSocialPostDetail } from "@/features/social-planner/hooks/use-social-post-detail";
import { useSocialPostMutations } from "@/features/social-planner/hooks/use-social-post-mutations";
import type {
  ComposeValidationResult,
  CreateSocialPostTargetInput,
  PlatformSchema,
} from "@/features/social-planner/types";
import { uploadSocialMediaFile } from "@/features/social-planner/utils/social-media-upload.util";
import { TikTokDestinationFields } from "@/features/social-planner/components/tiktok-destination-fields";
import { YouTubeDestinationFields } from "@/features/social-planner/components/youtube-destination-fields";
import { PinterestDestinationFields } from "@/features/social-planner/components/pinterest-destination-fields";
import { StorageUploadError } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SOCIAL_PROVIDER_KEYS = [
  "facebook",
  "instagram",
  "linkedin",
  "x",
  "youtube",
  "tiktok",
  "google-business-profile",
  "pinterest",
] as const;

type DestinationDraft = CreateSocialPostTargetInput & {
  selected: boolean;
  resourceName?: string;
};

export function SocialPostComposerPage() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const postId = typeof params?.id === "string" ? params.id : undefined;
  const { data: existing } = useSocialPostDetail(postId);
  const { data: schemas } = usePlatformSchemas();
  const mutations = useSocialPostMutations();

  const [caption, setCaption] = useState("");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [scheduledAtLocal, setScheduledAtLocal] = useState("");
  const [mediaIds, setMediaIds] = useState<string[]>([]);
  const [mediaNames, setMediaNames] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<DestinationDraft[]>([]);
  const [validation, setValidation] = useState<ComposeValidationResult | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const resourceQueries = useQueries({
    queries: SOCIAL_PROVIDER_KEYS.map((providerKey) => ({
      queryKey: ["social-planner", "resources", providerKey],
      queryFn: () => listIntegrationResources(providerKey),
      staleTime: 60_000,
      retry: false,
    })),
  });

  /** Stable key so destination sync does not re-run every render (useQueries returns a new array). */
  const resourcesSyncKey = resourceQueries
    .map((query, index) => {
      const providerKey = SOCIAL_PROVIDER_KEYS[index];
      const ids = (query.data?.resources ?? [])
        .filter((r) => r.isSelected || r.isDefault)
        .map((r) => r.id)
        .join(",");
      return `${providerKey}:${query.status}:${ids}`;
    })
    .join("|");

  const schemaByKey = useMemo(() => {
    const map = new Map<string, PlatformSchema>();
    for (const schema of schemas ?? []) {
      map.set(schema.providerKey, schema);
    }
    return map;
  }, [schemas]);

  useEffect(() => {
    if (!existing) return;
    setCaption(existing.caption);
    setTimezone(existing.timezone ?? timezone);
    setMediaIds(existing.media.map((m) => m.fileAssetId));
    setMediaNames(
      existing.media.map((m) => m.fileName ?? m.fileAssetId.slice(0, 8)),
    );
    setDestinations(
      existing.targets.map((t) => ({
        selected: true,
        providerKey: t.providerKey,
        integrationResourceId: t.integrationResourceId ?? undefined,
        postType: t.postType,
        platformPayload: t.platformPayload ?? {},
        resourceName: t.resourceName ?? undefined,
      })),
    );
    if (existing.targets[0]) {
      setActiveTab(existing.targets[0].providerKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once when detail loads
  }, [existing?.id]);

  useEffect(() => {
    if (existing) return;

    const next: DestinationDraft[] = [];
    for (let index = 0; index < SOCIAL_PROVIDER_KEYS.length; index += 1) {
      const providerKey = SOCIAL_PROVIDER_KEYS[index];
      const resources = resourceQueries[index]?.data?.resources ?? [];
      for (const resource of resources.filter(
        (r) => r.isSelected || r.isDefault,
      )) {
        next.push({
          selected: false,
          providerKey,
          integrationResourceId: resource.id,
          resourceName: resource.name,
          postType: schemaByKey.get(providerKey)?.postTypes[0]?.key ?? "FEED",
          platformPayload:
            providerKey === "youtube"
              ? {
                  privacyStatus: "public",
                  madeForKids: false,
                  categoryId: "22",
                }
              : {},
        });
      }
    }

    setDestinations((prev) => {
      const prevByKey = new Map(
        prev.map((d) => [
          `${d.providerKey}:${d.integrationResourceId ?? ""}`,
          d,
        ]),
      );

      const merged = next.map((d) => {
        const key = `${d.providerKey}:${d.integrationResourceId ?? ""}`;
        const prior = prevByKey.get(key);
        if (!prior) return d;
        return {
          ...d,
          selected: prior.selected,
          postType: prior.postType ?? d.postType,
          platformPayload: prior.platformPayload ?? d.platformPayload,
        };
      });

      if (
        prev.length === merged.length &&
        prev.every((p, i) => {
          const m = merged[i];
          return (
            p.providerKey === m.providerKey &&
            p.integrationResourceId === m.integrationResourceId &&
            p.resourceName === m.resourceName &&
            p.selected === m.selected &&
            p.postType === m.postType
          );
        })
      ) {
        return prev;
      }
      return merged;
    });

    if (next[0]?.providerKey) {
      setActiveTab((tab) => tab || next[0].providerKey);
    }
    // resourceQueries read via resourcesSyncKey — avoid depending on unstable array identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourcesSyncKey, schemaByKey, existing]);

  const selectedTargets = destinations.filter((d) => d.selected);

  const platformTab =
    selectedTargets.some((d) => d.providerKey === activeTab)
      ? activeTab
      : (selectedTargets[0]?.providerKey ?? "");

  useEffect(() => {
    if (platformTab && platformTab !== activeTab) {
      setActiveTab(platformTab);
    }
  }, [platformTab, activeTab]);

  const buildBody = () => ({
    caption,
    timezone,
    mediaFileAssetIds: mediaIds,
    targets: selectedTargets.map((d) => ({
      providerKey: d.providerKey,
      integrationResourceId: d.integrationResourceId,
      postType: d.postType,
      platformPayload: d.platformPayload ?? {},
    })),
  });

  const runValidate = async () => {
    if (selectedTargets.length === 0) {
      setValidation({ ok: false, targets: [] });
      toast.error("Select at least one destination");
      return null;
    }
    try {
      const result = await mutations.validate.mutateAsync(buildBody());
      setValidation(result);
      if (!result.ok) {
        const firstIssue = result.targets
          .flatMap((t) => t.issues.map((i) => i.message))
          .find(Boolean);
        toast.error(firstIssue ?? "Validation failed");
      }
      return result;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Validation request failed",
      );
      return null;
    }
  };

  const saveDraft = async () => {
    if (postId) {
      await mutations.update.mutateAsync({ id: postId, body: buildBody() });
      return postId;
    }
    const created = await mutations.create.mutateAsync(buildBody());
    router.replace(`/business/social-planner/${created.id}/edit`);
    return created.id;
  };

  const onScheduleOrPublish = async (mode: "schedule" | "now") => {
    try {
      const result = await runValidate();
      if (!result?.ok) return;
      const id = await saveDraft();
      if (mode === "now") {
        await mutations.publishNow.mutateAsync(id);
      } else {
        if (!scheduledAtLocal) {
          toast.error("Pick a schedule date/time first");
          return;
        }
        await mutations.schedule.mutateAsync({
          id,
          scheduledAt: new Date(scheduledAtLocal).toISOString(),
          timezone,
        });
      }
      router.push("/business/social-planner/posts");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not publish post",
      );
    }
  };

  const updateDestination = (
    providerKey: string,
    resourceId: string | undefined,
    patch: Partial<DestinationDraft>,
  ) => {
    setDestinations((prev) =>
      prev.map((d) =>
        d.providerKey === providerKey &&
        d.integrationResourceId === resourceId
          ? { ...d, ...patch }
          : d,
      ),
    );
  };

  return (
    <PageContainer className="mx-auto max-w-4xl">
      <PageHeader
        title={postId ? "Edit post" : "Compose post"}
        description="Shared caption and media, customize per destination"
        actions={
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/business/social-planner" />}
          >
            Back to calendar
          </Button>
        }
      />

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="font-medium">Destinations</h2>
        <p className="text-sm text-muted-foreground">
          Connect accounts in{" "}
          <Link
            href="/business/settings/integrations"
            className="underline underline-offset-2"
          >
            Settings → Integrations
          </Link>
          .
        </p>
        <div className="flex flex-wrap gap-2">
          {destinations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No connected social resources found.
            </p>
          ) : (
            destinations.map((dest) => {
              const valid = validation?.targets.find(
                (t) => t.providerKey === dest.providerKey,
              );
              return (
                <button
                  key={`${dest.providerKey}:${dest.integrationResourceId}`}
                  type="button"
                  onClick={() => {
                    const nextSelected = !dest.selected;
                    updateDestination(
                      dest.providerKey,
                      dest.integrationResourceId,
                      { selected: nextSelected },
                    );
                    if (nextSelected) {
                      setActiveTab(dest.providerKey);
                    }
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm",
                    dest.selected
                      ? "border-primary bg-primary/10"
                      : "border-border text-muted-foreground",
                    dest.selected &&
                      valid &&
                      (valid.valid
                        ? "ring-1 ring-emerald-500"
                        : "ring-1 ring-red-500"),
                  )}
                >
                  {dest.providerKey}
                  {dest.resourceName ? ` · ${dest.resourceName}` : ""}
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <div className="space-y-2">
          <Label htmlFor="caption">Caption</Label>
          <Textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={5}
            placeholder="Write your post…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="media">Media</Label>
          <Input
            id="media"
            type="file"
            accept={
              (() => {
                const selected = destinations.filter((d) => d.selected);
                const videoOnly =
                  selected.length > 0 &&
                  selected.every(
                    (d) =>
                      d.providerKey === "tiktok" ||
                      d.providerKey === "youtube",
                  );
                return videoOnly ? "video/*" : "image/*,video/*";
              })()
            }
            multiple
            disabled={uploading}
            onChange={async (event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length === 0) return;
              setUploading(true);
              try {
                for (const file of files) {
                  const asset = await uploadSocialMediaFile(file);
                  setMediaIds((prev) => [...prev, asset.id]);
                  setMediaNames((prev) => [
                    ...prev,
                    asset.filename ?? file.name,
                  ]);
                }
              } catch (err) {
                toast.error(
                  err instanceof StorageUploadError
                    ? err.message
                    : err instanceof Error
                      ? err.message
                      : "Upload failed",
                );
              } finally {
                setUploading(false);
                event.target.value = "";
              }
            }}
          />
          {mediaNames.length > 0 ? (
            <ul className="text-sm text-muted-foreground">
              {mediaNames.map((name, index) => (
                <li key={`${name}-${index}`}>{name}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {selectedTargets.length > 0 ? (
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-medium">Platform settings</h2>
          <p className="text-sm text-muted-foreground">
            Required options for each selected destination (TikTok privacy,
            disclosures, etc.).
          </p>
          <Tabs value={platformTab || undefined} onValueChange={setActiveTab}>
            <TabsList className="flex h-auto flex-wrap">
              {selectedTargets.map((dest) => {
                const valid = validation?.targets.find(
                  (t) => t.providerKey === dest.providerKey,
                );
                return (
                  <TabsTrigger key={dest.providerKey} value={dest.providerKey}>
                    {dest.providerKey}
                    {valid ? (valid.valid ? " ✓" : " ✕") : ""}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {selectedTargets.map((dest) => {
              const schema = schemaByKey.get(dest.providerKey);
              const issues =
                validation?.targets.find(
                  (t) => t.providerKey === dest.providerKey,
                )?.issues ?? [];
              return (
                <TabsContent
                  key={dest.providerKey}
                  value={dest.providerKey}
                  className="space-y-3 pt-3"
                >
                  {schema?.postTypes?.length ? (
                    <div className="space-y-2">
                      <Label>Post type</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                        value={dest.postType ?? schema.postTypes[0].key}
                        onChange={(e) =>
                          updateDestination(
                            dest.providerKey,
                            dest.integrationResourceId,
                            { postType: e.target.value },
                          )
                        }
                      >
                        {schema.postTypes.map((pt) => (
                          <option key={pt.key} value={pt.key}>
                            {pt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  {dest.providerKey === "tiktok" ? (
                    <TikTokDestinationFields
                      resourceId={dest.integrationResourceId}
                      platformPayload={dest.platformPayload ?? {}}
                      onChange={(platformPayload) =>
                        updateDestination(
                          dest.providerKey,
                          dest.integrationResourceId,
                          { platformPayload },
                        )
                      }
                    />
                  ) : dest.providerKey === "youtube" ? (
                    <YouTubeDestinationFields
                      resourceName={dest.resourceName}
                      postType={dest.postType}
                      platformPayload={dest.platformPayload ?? {}}
                      onChange={(platformPayload) =>
                        updateDestination(
                          dest.providerKey,
                          dest.integrationResourceId,
                          { platformPayload },
                        )
                      }
                    />
                  ) : dest.providerKey === "pinterest" ? (
                    <PinterestDestinationFields
                      resourceName={dest.resourceName}
                      platformPayload={dest.platformPayload ?? {}}
                      onChange={(platformPayload) =>
                        updateDestination(
                          dest.providerKey,
                          dest.integrationResourceId,
                          { platformPayload },
                        )
                      }
                    />
                  ) : (
                    (schema?.fields ?? []).map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label>
                        {field.label}
                        {field.required ? " *" : ""}
                      </Label>
                      {field.type === "select" ? (
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                          value={String(
                            dest.platformPayload?.[field.key] ??
                              field.defaultValue ??
                              "",
                          )}
                          onChange={(e) =>
                            updateDestination(
                              dest.providerKey,
                              dest.integrationResourceId,
                              {
                                platformPayload: {
                                  ...dest.platformPayload,
                                  [field.key]: e.target.value,
                                },
                              },
                            )
                          }
                        >
                          <option value="">Select…</option>
                          {(field.options ?? []).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : field.type === "boolean" ? (
                        <input
                          type="checkbox"
                          checked={Boolean(
                            dest.platformPayload?.[field.key] ??
                              field.defaultValue,
                          )}
                          onChange={(e) =>
                            updateDestination(
                              dest.providerKey,
                              dest.integrationResourceId,
                              {
                                platformPayload: {
                                  ...dest.platformPayload,
                                  [field.key]: e.target.checked,
                                },
                              },
                            )
                          }
                        />
                      ) : (
                        <Input
                          value={String(
                            dest.platformPayload?.[field.key] ?? "",
                          )}
                          onChange={(e) =>
                            updateDestination(
                              dest.providerKey,
                              dest.integrationResourceId,
                              {
                                platformPayload: {
                                  ...dest.platformPayload,
                                  [field.key]: e.target.value,
                                },
                              },
                            )
                          }
                        />
                      )}
                      {field.helpText ? (
                        <p className="text-xs text-muted-foreground">
                          {field.helpText}
                        </p>
                      ) : null}
                    </div>
                  ))
                  )}
                  {issues.length > 0 ? (
                    <ul className="space-y-1 text-sm text-red-600">
                      {issues.map((issue, i) => (
                        <li key={`${issue.message}-${i}`}>{issue.message}</li>
                      ))}
                    </ul>
                  ) : null}
                </TabsContent>
              );
            })}
          </Tabs>
        </section>
      ) : null}

      <section className="space-y-3 rounded-lg border p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="scheduledAt">Schedule at</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAtLocal}
              onChange={(e) => setScheduledAtLocal(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => void runValidate()}
            disabled={mutations.validate.isPending}
          >
            Validate
          </Button>
          <Button
            variant="secondary"
            onClick={() => void saveDraft()}
            disabled={
              selectedTargets.length === 0 ||
              mutations.create.isPending ||
              mutations.update.isPending
            }
          >
            Save draft
          </Button>
          <Button
            onClick={() => void onScheduleOrPublish("schedule")}
            disabled={!scheduledAtLocal || selectedTargets.length === 0}
          >
            Schedule
          </Button>
          <Button
            variant="default"
            onClick={() => void onScheduleOrPublish("now")}
            disabled={selectedTargets.length === 0}
          >
            Post now
          </Button>
        </div>
      </section>
    </PageContainer>
  );
}
