"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DrawerSegmentedTabs } from "@/components/drawer/drawer-segmented-tabs";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { SettingsInlineEditSection } from "@/components/layout/settings-inline-edit-section";
import { SettingsViewRows } from "@/components/layout/settings-view-rows";
import type { ServiceStaffAssignment } from "@/features/services/api/service-workspace.api";
import {
  formatCommissionValue,
  formatDurationMinutes,
  formatServicePrice,
} from "@/features/services/schemas/service-details";
import { durationPresetItems } from "@/features/services/types/selection";
import { DRAWER_SWITCH_CLASS } from "@/lib/design/drawer-tokens";
import { SETTINGS_FORM_DESCRIPTION_CLASS } from "@/lib/design/settings-form-tokens";
import { useSettingsSectionEdit } from "@/lib/settings/use-settings-section-edit";
import { cn } from "@/lib/utils";

type MemberRow = {
  userId: string;
  name: string;
  email: string;
};

type StaffDraft = {
  enabled: boolean;
  durationMinutes: string;
  price: string;
  commissionType: "FLAT" | "PERCENT";
  commissionValue: string;
  onlineBookingEnabled: boolean;
};

type Props = {
  staff: ServiceStaffAssignment[];
  members: Array<{
    userId: string;
    status: string;
    user: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
  }>;
  durationPresets: number[];
  serviceDurationMinutes: number;
  servicePrice: string | null;
  directLinks: Array<{ userId: string; url: string }>;
  requiresTwoStaff?: boolean;
  isSaving?: boolean;
  onSave: (staff: Record<string, unknown>[]) => Promise<void> | void;
};

function memberDisplayName(member: MemberRow): string {
  return member.name || member.email;
}

function buildDraft(
  assignment: ServiceStaffAssignment | undefined,
  serviceDuration: number,
  servicePrice: string | null,
): StaffDraft {
  return {
    enabled: assignment ? Boolean(assignment.isEnabled) : false,
    durationMinutes: String(
      assignment?.durationMinutes ?? serviceDuration ?? 60,
    ),
    price: assignment?.price ?? servicePrice ?? "",
    commissionType: assignment?.commissionType ?? "PERCENT",
    commissionValue: assignment?.commissionValue ?? "",
    onlineBookingEnabled: assignment
      ? Boolean(assignment.onlineBookingEnabled)
      : true,
  };
}

export function ServiceStaffSection({
  staff,
  members,
  durationPresets,
  serviceDurationMinutes,
  servicePrice,
  directLinks,
  requiresTwoStaff = false,
  isSaving = false,
  onSave,
}: Props) {
  const { isEditing, startEdit, stopEdit } = useSettingsSectionEdit<"staff">();
  const durationItems = durationPresetItems(durationPresets);

  const activeMembers: MemberRow[] = useMemo(
    () =>
      members
        .filter((m) => m.status === "ACTIVE")
        .map((m) => ({
          userId: m.userId,
          name: [m.user.firstName, m.user.lastName].filter(Boolean).join(" "),
          email: m.user.email,
        })),
    [members],
  );

  const [drafts, setDrafts] = useState<Record<string, StaffDraft>>({});
  const [baseline, setBaseline] = useState("");

  const syncFromProps = () => {
    const next: Record<string, StaffDraft> = {};
    for (const member of activeMembers) {
      const existing = staff.find((s) => s.userId === member.userId);
      next[member.userId] = buildDraft(
        existing,
        serviceDurationMinutes,
        servicePrice,
      );
    }
    setDrafts(next);
    setBaseline(JSON.stringify(next));
  };

  useEffect(() => {
    syncFromProps();
    stopEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff, activeMembers, serviceDurationMinutes, servicePrice]);

  const isDirty = JSON.stringify(drafts) !== baseline;
  const enabledMembers = activeMembers.filter((m) => drafts[m.userId]?.enabled);

  const copyLink = (url: string) => {
    void navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  const updateDraft = (userId: string, patch: Partial<StaffDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [userId]: { ...prev[userId]!, ...patch },
    }));
  };

  return (
    <SettingsInlineEditSection
      title="Staff"
      description={
        requiresTwoStaff
          ? "Exactly two enabled staff are required before activating this service."
          : undefined
      }
      summary={
        enabledMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No staff assigned yet.
          </p>
        ) : (
          <div className="space-y-6">
            {enabledMembers.map((member) => {
              const row = drafts[member.userId]!;
              const link = directLinks.find((l) => l.userId === member.userId)
                ?.url;
              return (
                <div key={member.userId} className="space-y-2">
                  <p className="text-sm font-medium">
                    {memberDisplayName(member)}
                  </p>
                  <SettingsViewRows
                    rows={[
                      {
                        label: "Duration",
                        value: formatDurationMinutes(
                          Number(row.durationMinutes) || null,
                        ),
                      },
                      {
                        label: "Price",
                        value: formatServicePrice(row.price || null),
                      },
                      {
                        label: "Commission",
                        value: formatCommissionValue(
                          row.commissionValue || null,
                          row.commissionType,
                        ),
                      },
                      {
                        label: "Online booking",
                        value: row.onlineBookingEnabled ? "On" : "Off",
                      },
                      ...(link
                        ? [{ label: "Direct Link", value: "Available" }]
                        : []),
                    ]}
                  />
                </div>
              );
            })}
          </div>
        )
      }
      isEditing={isEditing("staff")}
      onEdit={() => startEdit("staff")}
      onDiscard={() => {
        syncFromProps();
        stopEdit();
      }}
      onSave={() =>
        void (async () => {
          await onSave(
            Object.entries(drafts)
              .filter(([, a]) => a.enabled)
              .map(([userId, a]) => ({
                userId,
                isEnabled: true,
                durationMinutes: a.durationMinutes
                  ? Number(a.durationMinutes)
                  : null,
                price: a.price ? Number(a.price) : null,
                commissionType: a.commissionValue ? a.commissionType : null,
                commissionValue: a.commissionValue
                  ? Number(a.commissionValue)
                  : null,
                onlineBookingEnabled: a.onlineBookingEnabled,
              })),
          );
          stopEdit();
        })()
      }
      isDirty={isDirty}
      isSaving={isSaving}
    >
      <div className="space-y-6">
        {activeMembers.map((member) => {
          const row = drafts[member.userId];
          if (!row) return null;
          const link = directLinks.find((l) => l.userId === member.userId)?.url;
          return (
            <div
              key={member.userId}
              className="space-y-4 border-b border-border pb-6 last:border-b-0 last:pb-0"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {memberDisplayName(member)}
                  </p>
                  <p className={cn(SETTINGS_FORM_DESCRIPTION_CLASS, "text-xs")}>
                    {member.email}
                  </p>
                </div>
                <Switch
                  checked={row.enabled}
                  onCheckedChange={(checked) =>
                    updateDraft(member.userId, { enabled: checked })
                  }
                  className={DRAWER_SWITCH_CLASS}
                  aria-label={`Enable ${memberDisplayName(member)}`}
                />
              </div>

              {row.enabled ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <SearchableSelect
                      items={durationItems}
                      value={row.durationMinutes}
                      onValueChange={(value) =>
                        updateDraft(member.userId, {
                          durationMinutes: value ?? row.durationMinutes,
                        })
                      }
                      placeholder="Select duration"
                      searchable={false}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Price</Label>
                    <Input
                      type="number"
                      min={0}
                      value={row.price}
                      placeholder="Enter price"
                      onChange={(e) =>
                        updateDraft(member.userId, { price: e.target.value })
                      }
                    />
                  </div>

                  <Accordion multiple defaultValue={[]}>
                    <AccordionItem value="options" className="border-none">
                      <AccordionTrigger className="px-0 text-base font-medium text-violet-primary-normal hover:no-underline">
                        Additional Options
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pb-0">
                        <div className="space-y-2">
                          <Label>Commission</Label>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              min={0}
                              className="flex-1"
                              value={row.commissionValue}
                              placeholder="Enter commission"
                              onChange={(e) =>
                                updateDraft(member.userId, {
                                  commissionValue: e.target.value,
                                })
                              }
                            />
                            <DrawerSegmentedTabs
                              size="sm"
                              className="w-auto shrink-0"
                              value={row.commissionType}
                              options={[
                                {
                                  value: "FLAT",
                                  label: "$",
                                  onClick: () =>
                                    updateDraft(member.userId, {
                                      commissionType: "FLAT",
                                    }),
                                },
                                {
                                  value: "PERCENT",
                                  label: "%",
                                  onClick: () =>
                                    updateDraft(member.userId, {
                                      commissionType: "PERCENT",
                                    }),
                                },
                              ]}
                            />
                          </div>
                        </div>

                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 space-y-1">
                            <Label className="text-sm font-medium">
                              Enable in online booking
                            </Label>
                            <p className={SETTINGS_FORM_DESCRIPTION_CLASS}>
                              Allow this staff member to be booked online for
                              this service.
                            </p>
                          </div>
                          <Switch
                            checked={row.onlineBookingEnabled}
                            onCheckedChange={(checked) =>
                              updateDraft(member.userId, {
                                onlineBookingEnabled: checked,
                              })
                            }
                            className={DRAWER_SWITCH_CLASS}
                          />
                        </div>

                        {link ? (
                          <div className="space-y-1">
                            <Label>Direct Link</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => copyLink(link)}
                            >
                              <Copy className="mr-1 size-3" aria-hidden />
                              Copy direct link
                            </Button>
                          </div>
                        ) : null}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </SettingsInlineEditSection>
  );
}
