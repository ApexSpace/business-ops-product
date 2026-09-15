"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { LinkedService } from "@/features/resources/types";
import { SETTINGS_FORM_SECTION_STACK_CLASS } from "@/lib/design/settings-form-tokens";
import { cn } from "@/lib/utils";

type ResourceServicesSectionProps = {
  linkedServices: LinkedService[];
};

export function ResourceServicesSection({
  linkedServices,
}: ResourceServicesSectionProps) {
  const { services, customizations } = useMemo(() => {
    const servicesList: LinkedService[] = [];
    const customizationsList: LinkedService[] = [];
    for (const link of linkedServices) {
      if (link.source === "service_option") {
        customizationsList.push(link);
      } else {
        servicesList.push(link);
      }
    }
    return { services: servicesList, customizations: customizationsList };
  }, [linkedServices]);

  return (
    <div className={cn(SETTINGS_FORM_SECTION_STACK_CLASS, "max-w-3xl")}>
      <AssignmentBlock
        title="Assigned to the following services"
        empty="Not assigned to any services."
        items={services}
      />
      <AssignmentBlock
        title="Assigned to the following service customizations"
        empty="Not assigned to any service customizations."
        items={customizations}
      />
      <p className="text-xs text-muted-foreground">
        If this service requires more resources, you can add resource
        requirements from a service&apos;s Resources tab.
      </p>
    </div>
  );
}

function AssignmentBlock({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: LinkedService[];
}) {
  return (
    <section className="space-y-[var(--spacing-3)]">
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((link) => (
            <li
              key={`${link.source}-${link.requirementId}`}
              className="text-sm text-foreground"
            >
              <Link
                href="/business/settings/services"
                className="font-medium text-primary hover:underline"
              >
                {link.serviceName}
              </Link>
              {link.optionName || link.label ? (
                <span className="text-muted-foreground">
                  {" · "}
                  {link.optionName ?? link.label}
                  {` · Qty ${link.quantity}`}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {` · Qty ${link.quantity}`}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
