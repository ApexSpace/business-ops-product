"use client";

import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { listAvailableMembershipsForService } from "@/features/memberships/api/memberships.api";

interface CheckoutMembershipFieldProps {
  contactId: string | null;
  serviceId: string | null;
  value: string;
  onValueChange: (value: string) => void;
}

/** Radio value encodes `membershipId:serviceGroupId` for redemption. */
export function CheckoutMembershipField({
  contactId,
  serviceId,
  value,
  onValueChange,
}: CheckoutMembershipFieldProps) {
  const membershipsQuery = useQuery({
    queryKey: ["checkout-memberships", contactId, serviceId],
    queryFn: () =>
      listAvailableMembershipsForService(contactId!, serviceId!),
    enabled: Boolean(contactId && serviceId),
  });

  const options =
    membershipsQuery.data?.flatMap((membership) =>
      membership.usageRecords.map((record) => ({
        key: `${membership.membershipId}:${record.serviceGroupId}`,
        membershipId: membership.membershipId,
        serviceGroupId: record.serviceGroupId,
        label: `${membership.planName} (${record.remaining} remaining)`,
      })),
    ) ?? [];

  if (!contactId || !serviceId || options.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label>Use membership</Label>
      <RadioGroup
        value={value || "none"}
        onValueChange={(next) => onValueChange(next === "none" ? "" : next)}
        className="space-y-2"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="none" id="membership-none" />
          <Label htmlFor="membership-none">Pay normally</Label>
        </div>
        {options.map((option) => (
          <div key={option.key} className="flex items-center gap-2">
            <RadioGroupItem value={option.key} id={`membership-${option.key}`} />
            <Label htmlFor={`membership-${option.key}`}>{option.label}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

export function parseMembershipRedemptionSelection(value: string): {
  clientMembershipId?: string;
  membershipServiceGroupId?: string;
} {
  if (!value) return {};
  const [clientMembershipId, membershipServiceGroupId] = value.split(":");
  if (!clientMembershipId || !membershipServiceGroupId) return {};
  return { clientMembershipId, membershipServiceGroupId };
}
