"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SettingsChoiceRadioGroup } from "@/components/forms/settings-choice-radio-group";
import { SettingsInlineEditSection } from "@/components/layout/settings-inline-edit-section";
import { SettingsViewRows } from "@/components/layout/settings-view-rows";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { OfferDateRuleBuilder } from "@/features/offers/components/offer-date-rule-builder";
import { listMembershipPlans } from "@/features/memberships/api/memberships.api";
import { listBusinessMembers } from "@/features/settings/api/business.api";
import type {
  Offer,
  OfferApplicationMode,
  OfferMembershipScope,
} from "@/features/offers/types";
import {
  applicationModeLabel,
  membershipScopeLabel,
  offerToUpdateInput,
  toggleId,
} from "@/features/offers/utils/offer-workspace-utils";
import { DRAWER_SWITCH_CLASS } from "@/lib/design/drawer-tokens";
import {
  SETTINGS_FORM_DESCRIPTION_CLASS,
  SETTINGS_FORM_SECTION_STACK_CLASS,
} from "@/lib/design/settings-form-tokens";
import { useSettingsSectionEdit } from "@/lib/settings/use-settings-section-edit";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

type OfferDetailsSectionProps = {
  offer: Offer;
  canManage?: boolean;
  isSaving?: boolean;
  onSave: (body: ReturnType<typeof offerToUpdateInput>) => Promise<void> | void;
};

function memberLabel(member: {
  user: { firstName?: string | null; lastName?: string | null; email: string };
}) {
  return (
    [member.user.firstName, member.user.lastName].filter(Boolean).join(" ") ||
    member.user.email
  );
}

function ConditionToggle({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  children,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-[var(--spacing-3)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className={cn(SETTINGS_FORM_DESCRIPTION_CLASS, "text-xs")}>
            {description}
          </p>
        </div>
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          className={DRAWER_SWITCH_CLASS}
        />
      </div>
      {checked && children ? (
        <div className="min-w-0 space-y-[var(--spacing-3)] pl-0 sm:pl-1">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function OfferDetailsSection({
  offer,
  canManage = true,
  isSaving = false,
  onSave,
}: OfferDetailsSectionProps) {
  const { isEditing, startEdit, stopEdit } =
    useSettingsSectionEdit<"details">();
  const [draft, setDraft] = useState<Offer>(offer);

  useEffect(() => {
    setDraft(offer);
    stopEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer.id, offer.updatedAt]);

  const membershipPlansQuery = useQuery({
    queryKey: queryKeys.memberships.plans(),
    queryFn: () => listMembershipPlans(),
    enabled: isEditing("details"),
  });

  const teamQuery = useQuery({
    queryKey: queryKeys.business.members({ limit: 100 }),
    queryFn: () => listBusinessMembers({ page: 1, limit: 100 }),
    enabled: isEditing("details"),
  });

  const membershipPlans = useMemo(
    () => (membershipPlansQuery.data ?? []).filter((plan) => !plan.isArchived),
    [membershipPlansQuery.data],
  );

  const teamMembers = useMemo(
    () =>
      (teamQuery.data?.items ?? []).filter(
        (member) => member.status === "ACTIVE",
      ),
    [teamQuery.data?.items],
  );

  const eligibilitySummary = useMemo(() => {
    const parts: string[] = [];
    if (offer.minAmountEnabled) {
      parts.push(`Minimum sale amount: $${offer.minAmount ?? "0"}`);
    }
    if (offer.oncePerClient) parts.push("Once per client");
    if (offer.newClientsOnly) parts.push("New clients only");
    if (offer.membershipRequired) {
      parts.push(
        `Membership required — ${membershipScopeLabel(offer.membershipScope)}`,
      );
    }
    if (offer.specificProvidersEnabled) {
      parts.push("Specific providers only");
    }
    if (parts.length === 0) {
      return "No additional eligibility restrictions";
    }
    return parts.join(" · ");
  }, [offer]);

  return (
    <div className={cn(SETTINGS_FORM_SECTION_STACK_CLASS, "max-w-3xl")}>
      <SettingsInlineEditSection
        title="Details"
        summary={
          <SettingsViewRows
            rows={[
              { label: "Name", value: offer.name },
              {
                label: "Description",
                value: offer.description?.trim() || null,
              },
              {
                label: "How does this offer get applied?",
                value: applicationModeLabel(
                  offer.applicationMode,
                  offer.offerCode,
                ),
              },
              {
                label: "Limits",
                value: eligibilitySummary,
              },
            ]}
          />
        }
        isEditing={isEditing("details")}
        onEdit={() => {
          if (!canManage) return;
          setDraft({ ...offer });
          startEdit("details");
        }}
        disabled={!canManage}
        onDiscard={() => {
          setDraft({ ...offer });
          stopEdit();
        }}
        onSave={() =>
          void (async () => {
            await onSave(offerToUpdateInput(draft));
            stopEdit();
          })()
        }
        isDirty={JSON.stringify(offerToUpdateInput(draft)) !== JSON.stringify(offerToUpdateInput(offer))}
        isSaving={isSaving}
      >
        <div className="space-y-[var(--spacing-6)]">
          <div className="space-y-[var(--spacing-4)]">
            <div className="space-y-2">
              <Label htmlFor="offer-name">Name</Label>
              <Input
                id="offer-name"
                value={draft.name}
                onChange={(e) =>
                  setDraft({ ...draft, name: e.target.value })
                }
                placeholder="Enter name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-description">Description</Label>
              <Input
                id="offer-description"
                value={draft.description ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                placeholder="Enter description"
              />
            </div>
          </div>

          <div className="space-y-[var(--spacing-4)]">
            <p className="text-sm font-medium text-foreground">
              How does this offer get applied?
            </p>
            <SettingsChoiceRadioGroup
              name="application-mode"
              aria-label="How does this offer get applied?"
              value={draft.applicationMode}
              onValueChange={(value) =>
                setDraft({
                  ...draft,
                  applicationMode: value as OfferApplicationMode,
                })
              }
              options={[
                {
                  value: "STAFF_ONLY",
                  label: "Only by staff members",
                  description:
                    "Offer can only be applied manually during checkout.",
                },
                {
                  value: "OFFER_CODE",
                  label: "With an offer code",
                  description:
                    "Set an offer code that clients can enter in online booking.",
                  children: (
                    <div className="space-y-2">
                      <Label htmlFor="offer-code">Offer Code</Label>
                      <Input
                        id="offer-code"
                        className="uppercase"
                        value={draft.offerCode ?? ""}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            offerCode: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="Enter offer code"
                      />
                    </div>
                  ),
                },
                {
                  value: "AUTOMATICALLY",
                  label: "Automatically",
                  description:
                    "Offer gets automatically applied based on time and date rules.",
                },
              ]}
            />
          </div>

          {draft.applicationMode === "AUTOMATICALLY" ? (
            <div className="space-y-[var(--spacing-4)]">
              <p className="text-sm font-medium text-foreground">
                Automatically apply this offer when every condition below is
                met:
              </p>
              <ConditionToggle
                label="By appointment date/time"
                description="Offer can only be used for appointments on specific dates or times."
                checked={draft.autoApptDateEnabled}
                onCheckedChange={(checked) =>
                  setDraft({ ...draft, autoApptDateEnabled: checked })
                }
              >
                <OfferDateRuleBuilder
                  rules={draft.autoApptDateRules ?? []}
                  onChange={(rules) =>
                    setDraft({ ...draft, autoApptDateRules: rules })
                  }
                />
              </ConditionToggle>
              <ConditionToggle
                label="By booking date"
                description="Offer can only be used for appointments booked on specific dates."
                checked={draft.autoBookingDateEnabled}
                onCheckedChange={(checked) =>
                  setDraft({ ...draft, autoBookingDateEnabled: checked })
                }
              >
                <OfferDateRuleBuilder
                  rules={draft.autoBookingDateRules ?? []}
                  onChange={(rules) =>
                    setDraft({ ...draft, autoBookingDateRules: rules })
                  }
                />
              </ConditionToggle>
              <ConditionToggle
                label="By sale date"
                description="Offer can only be used for sales on specific dates or days of the week."
                checked={draft.autoSaleDateEnabled}
                onCheckedChange={(checked) =>
                  setDraft({ ...draft, autoSaleDateEnabled: checked })
                }
              >
                <OfferDateRuleBuilder
                  rules={draft.autoSaleDateRules ?? []}
                  onChange={(rules) =>
                    setDraft({ ...draft, autoSaleDateRules: rules })
                  }
                />
              </ConditionToggle>
            </div>
          ) : null}

          <div className="space-y-[var(--spacing-4)]">
            <p className="text-sm font-medium text-foreground">
              Limit this offer to sales that meet all of the following:
            </p>
            <ConditionToggle
              label="Sales with a minimum amount"
              description="Offer can only be used on sales with a total greater than a set amount."
              checked={draft.minAmountEnabled}
              onCheckedChange={(checked) =>
                setDraft({ ...draft, minAmountEnabled: checked })
              }
            >
              <div className="space-y-2">
                <Label htmlFor="min-amount">Minimum Amount</Label>
                <Input
                  id="min-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.minAmount ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, minAmount: e.target.value })
                  }
                  placeholder="Enter minimum amount"
                />
              </div>
            </ConditionToggle>
            <ConditionToggle
              label="Once per client"
              description="Each client can only use this offer once."
              checked={draft.oncePerClient}
              onCheckedChange={(checked) =>
                setDraft({ ...draft, oncePerClient: checked })
              }
            />
            <ConditionToggle
              label="New clients only"
              description="Offer can only be used by new clients."
              checked={draft.newClientsOnly}
              onCheckedChange={(checked) =>
                setDraft({ ...draft, newClientsOnly: checked })
              }
            />
            <ConditionToggle
              label="Clients with a membership"
              description="Offer can only be used by clients with an active membership."
              checked={draft.membershipRequired}
              onCheckedChange={(checked) =>
                setDraft({
                  ...draft,
                  membershipRequired: checked,
                  membershipScope: checked
                    ? (draft.membershipScope ?? "ANY")
                    : null,
                })
              }
            >
              <SettingsChoiceRadioGroup
                name="membership-scope"
                aria-label="Membership scope"
                value={draft.membershipScope ?? "ANY"}
                onValueChange={(value) =>
                  setDraft({
                    ...draft,
                    membershipScope: value as OfferMembershipScope,
                    specificMembershipPlanIds:
                      value === "SPECIFIC"
                        ? (draft.specificMembershipPlanIds ?? [])
                        : [],
                  })
                }
                options={[
                  {
                    value: "ANY",
                    label: "Any membership",
                    description:
                      "Offer can be used by clients with any membership.",
                  },
                  {
                    value: "SPECIFIC",
                    label: "Specific membership(s)",
                    description:
                      "Offer can only be used by clients with certain membership(s).",
                    children: (
                      <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                        {membershipPlans.map((plan) => (
                          <label
                            key={plan.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Checkbox
                              checked={(
                                draft.specificMembershipPlanIds ?? []
                              ).includes(plan.id)}
                              onCheckedChange={(checked) =>
                                setDraft({
                                  ...draft,
                                  specificMembershipPlanIds: toggleId(
                                    draft.specificMembershipPlanIds ?? [],
                                    plan.id,
                                    checked === true,
                                  ),
                                })
                              }
                            />
                            {plan.name}
                          </label>
                        ))}
                        {membershipPlans.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No membership plans available.
                          </p>
                        ) : null}
                      </div>
                    ),
                  },
                ]}
              />
            </ConditionToggle>
            <ConditionToggle
              label="Specific service providers"
              description="Offer can only be used with specific service provider(s)."
              checked={draft.specificProvidersEnabled}
              onCheckedChange={(checked) =>
                setDraft({
                  ...draft,
                  specificProvidersEnabled: checked,
                  specificProviderIds: checked
                    ? (draft.specificProviderIds ?? [])
                    : [],
                })
              }
            >
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                {teamMembers.map((member) => (
                  <label
                    key={member.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={(draft.specificProviderIds ?? []).includes(
                        member.id,
                      )}
                      onCheckedChange={(checked) =>
                        setDraft({
                          ...draft,
                          specificProviderIds: toggleId(
                            draft.specificProviderIds ?? [],
                            member.id,
                            checked === true,
                          ),
                        })
                      }
                    />
                    {memberLabel(member)}
                  </label>
                ))}
                {teamMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active team members found.
                  </p>
                ) : null}
              </div>
            </ConditionToggle>
          </div>
        </div>
      </SettingsInlineEditSection>
    </div>
  );
}
