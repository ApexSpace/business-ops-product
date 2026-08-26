"use client";

import { Trash2  } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { OfferDateRule } from "@/features/offers/types";

const DAY_LABELS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

function emptyRule(): OfferDateRule {
  return { type: "date_range", startDate: "", endDate: "",
};
}

export function OfferDateRuleBuilder({
  rules,
  onChange,
}: {
  rules: OfferDateRule[];
  onChange: (rules: OfferDateRule[]) => void;
}) {
  const updateRule = (index: number, patch: Partial<OfferDateRule>) => {
    onChange(rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
  };

  return (
    <div className="space-y-3">
      {rules.map((rule, index) => (
        <div key={index} className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <Select
              value={rule.type}
              onValueChange={(value) =>
                updateRule(index, {
                  type: value as OfferDateRule["type"],
                  startDate: "",
                  endDate: "",
                  daysOfWeek: [],
                  startTime: "",
                  endTime: "",
                })
              }
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_range">Date range</SelectItem>
                <SelectItem value="recurring_days">Recurring days</SelectItem>
                <SelectItem value="recurring_time_window">
                  Recurring time window
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onChange(rules.filter((_, i) => i !== index))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>

          {rule.type === "date_range" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={rule.startDate ?? ""}
                  onChange={(e) =>
                    updateRule(index, { startDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>End date</Label>
                <Input
                  type="date"
                  value={rule.endDate ?? ""}
                  onChange={(e) => updateRule(index, { endDate: e.target.value })}
                />
              </div>
            </div>
          ) : null}

          {rule.type === "recurring_days" ||
          rule.type === "recurring_time_window" ? (
            <div className="flex flex-wrap gap-2">
              {DAY_LABELS.map((day) => {
                const selected = rule.daysOfWeek?.includes(day.value) ?? false;
                return (
                  <label
                    key={day.value}
                    className="flex items-center gap-1.5 text-sm"
                  >
                    <Checkbox
                      checked={selected}
                      onCheckedChange={(checked) => {
                        const current = rule.daysOfWeek ?? [];
                        const next = checked
                          ? [...current, day.value]
                          : current.filter((d) => d !== day.value);
                        updateRule(index, { daysOfWeek: next });
                      }}
                    />
                    {day.label}
                  </label>
                );
              })}
            </div>
          ) : null}

          {rule.type === "recurring_time_window" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>From</Label>
                <Input
                  type="time"
                  value={rule.startTime ?? ""}
                  onChange={(e) =>
                    updateRule(index, { startTime: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>To</Label>
                <Input
                  type="time"
                  value={rule.endTime ?? ""}
                  onChange={(e) => updateRule(index, { endTime: e.target.value })}
                />
              </div>
            </div>
          ) : null}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...rules, emptyRule()])}
      >
        Add rule
      </Button>
    </div>
  );
}
