"use client";

import { TextField } from "@/components/forms/text-field";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import {
  snapshotBrandingSchema,
  snapshotOverviewSchema,
  type SnapshotBrandingValues,
  type SnapshotOverviewValues,
} from "@/features/platform/schemas/snapshot-form";
import { useSnapshotEditor } from "@/features/platform/hooks/use-snapshot-editor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DEFAULT_ACCENT_COLOR = "#6366f1";

function toColorInputValue(hex: string | undefined, fallback = DEFAULT_ACCENT_COLOR): string {
  if (!hex) return fallback;
  const normalized = hex.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) return normalized;
  if (/^#[0-9A-Fa-f]{3}$/.test(normalized)) {
    const [, r, g, b] = normalized;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}

export function OverviewBuilder() {
  const { overview, setOverview, assets, updateAssets, canManage } =
    useSnapshotEditor();
  const branding = assets?.branding ?? {};

  const overviewForm = useForm<SnapshotOverviewValues>({
    resolver: zodResolver(snapshotOverviewSchema),
    defaultValues: overview,
  });

  const brandingForm = useForm<SnapshotBrandingValues>({
    resolver: zodResolver(snapshotBrandingSchema),
    defaultValues: {
      productName: branding.productName ?? "",
      accentColor: branding.accentColor ?? DEFAULT_ACCENT_COLOR,
      logoUrl: branding.logoUrl ?? "",
      publicPageTitle: branding.publicPageTitle ?? "",
    },
  });

  useEffect(() => {
    overviewForm.reset(overview);
  }, [overview, overviewForm]);

  useEffect(() => {
    brandingForm.reset({
      productName: branding.productName ?? "",
      accentColor: branding.accentColor ?? DEFAULT_ACCENT_COLOR,
      logoUrl: branding.logoUrl ?? "",
      publicPageTitle: branding.publicPageTitle ?? "",
    });
  }, [branding, brandingForm]);

  const watchedOverview = overviewForm.watch();
  const watchedBranding = brandingForm.watch();

  useEffect(() => {
    setOverview({
      name: watchedOverview.name ?? "",
      description: watchedOverview.description ?? "",
    });
  }, [watchedOverview.name, watchedOverview.description, setOverview]);

  useEffect(() => {
    const next = {
      productName: watchedBranding.productName?.trim() || undefined,
      accentColor: watchedBranding.accentColor?.trim() || undefined,
      logoUrl: watchedBranding.logoUrl?.trim() || undefined,
      publicPageTitle: watchedBranding.publicPageTitle?.trim() || undefined,
    };
    const unchanged =
      next.productName === (branding.productName ?? undefined) &&
      next.accentColor === (branding.accentColor ?? undefined) &&
      next.logoUrl === (branding.logoUrl ?? undefined) &&
      next.publicPageTitle === (branding.publicPageTitle ?? undefined);
    if (unchanged) return;
    updateAssets({ branding: next });
  }, [
    watchedBranding.productName,
    watchedBranding.accentColor,
    watchedBranding.logoUrl,
    watchedBranding.publicPageTitle,
    branding,
    updateAssets,
  ]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Snapshot details</CardTitle>
          <CardDescription>
            Name and describe this blueprint. Use clear, business-friendly language
            your team will recognize in the library.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...overviewForm}>
            <div className="space-y-4">
              <TextField
                control={overviewForm.control}
                name="name"
                label="Snapshot name"
                placeholder="Dental Practice"
                disabled={!canManage}
              />
              <TextField
                control={overviewForm.control}
                name="description"
                label="Description"
                placeholder="What type of business is this blueprint for?"
                multiline
                disabled={!canManage}
              />
            </div>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Product name, accent color, and logo shown on public booking pages and
            customer-facing surfaces.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...brandingForm}>
            <div className="space-y-4">
              <TextField
                control={brandingForm.control}
                name="productName"
                label="Product name"
                placeholder="Acme Dental"
                disabled={!canManage}
              />
              <FormField
                control={brandingForm.control}
                name="accentColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accent color</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <Input
                          type="color"
                          value={toColorInputValue(field.value)}
                          disabled={!canManage}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="h-10 w-14 shrink-0 cursor-pointer p-1"
                          aria-label="Pick accent color"
                        />
                        <Input
                          type="text"
                          value={field.value ?? ""}
                          disabled={!canManage}
                          onChange={(e) => field.onChange(e.target.value)}
                          placeholder={DEFAULT_ACCENT_COLOR}
                          className="font-mono"
                          spellCheck={false}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <TextField
                control={brandingForm.control}
                name="logoUrl"
                label="Logo URL"
                placeholder="https://…"
                disabled={!canManage}
              />
              <TextField
                control={brandingForm.control}
                name="publicPageTitle"
                label="Public page title"
                placeholder="Book with Acme Dental"
                disabled={!canManage}
              />
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
