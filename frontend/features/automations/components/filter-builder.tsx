"use client";

import { useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AutomationFilterRule,
  ConditionMetadata,
  FilterOperatorMetadata,
  TriggerFilterField,
} from "@/features/automations/types/metadata";

type FilterBuilderProps = {
  fields?: TriggerFilterField[];
  conditions?: ConditionMetadata[];
  operators: FilterOperatorMetadata[];
  value: AutomationFilterRule;
  onChange: (value: AutomationFilterRule) => void;
  disabled?: boolean;
  className?: string;
};

type FieldOption = {
  key: string;
  label: string;
  valueType: string;
  enumValues?: string[];
};

function toFieldOptions(
  fields?: TriggerFilterField[],
  conditions?: ConditionMetadata[],
): FieldOption[] {
  const fromFields =
    fields?.map((field) => ({
      key: field.key,
      label: field.label,
      valueType: field.type,
      enumValues: field.enumValues,
    })) ?? [];
  const fromConditions =
    conditions?.map((condition) => ({
      key: condition.key,
      label: condition.label,
      valueType: condition.valueType,
      enumValues: condition.enumValues,
    })) ?? [];
  return [...fromFields, ...fromConditions];
}

function defaultValueForType(valueType: string): string | number | boolean {
  if (valueType === "number") return 0;
  if (valueType === "boolean") return true;
  return "";
}

export function FilterBuilder({
  fields,
  conditions,
  operators,
  value,
  onChange,
  disabled,
  className,
}: FilterBuilderProps) {
  const fieldOptions = useMemo(
    () => toFieldOptions(fields, conditions),
    [fields, conditions],
  );
  const selectedField = fieldOptions.find(
    (field) => field.key === value.fieldKey,
  );

  const compatibleOperators = useMemo(() => {
    if (!selectedField) return operators;
    return operators.filter((operator) =>
      operator.supportedValueTypes.includes(selectedField.valueType),
    );
  }, [operators, selectedField]);

  useEffect(() => {
    if (!selectedField && fieldOptions[0]) {
      onChange({
        fieldKey: fieldOptions[0].key,
        operator: compatibleOperators[0]?.key ?? "eq",
        value: defaultValueForType(fieldOptions[0].valueType),
      });
    }
  }, [compatibleOperators, fieldOptions, onChange, selectedField]);

  const showValueInput = value.operator !== "exists";

  return (
    <div className={className}>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Field</Label>
          <Select
            value={value.fieldKey || null}
            onValueChange={(fieldKey) => {
              const field = fieldOptions.find((item) => item.key === fieldKey);
              onChange({
                fieldKey: fieldKey ?? "",
                operator: compatibleOperators[0]?.key ?? "eq",
                value: defaultValueForType(field?.valueType ?? "string"),
              });
            }}
            disabled={disabled || fieldOptions.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select field" />
            </SelectTrigger>
            <SelectContent>
              {fieldOptions.map((field) => (
                <SelectItem key={field.key} value={field.key}>
                  {field.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Operator</Label>
          <Select
            value={value.operator || null}
            onValueChange={(operator) =>
              onChange({
                ...value,
                operator: operator ?? "eq",
              })
            }
            disabled={disabled || compatibleOperators.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select operator" />
            </SelectTrigger>
            <SelectContent>
              {compatibleOperators.map((operator) => (
                <SelectItem key={operator.key} value={operator.key}>
                  {operator.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showValueInput ? (
          <div className="space-y-1.5">
            <Label>Value</Label>
            {selectedField?.enumValues?.length ? (
              <Select
                value={String(value.value)}
                onValueChange={(next) =>
                  onChange({
                    ...value,
                    value: next ?? "",
                  })
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select value" />
                </SelectTrigger>
                <SelectContent>
                  {selectedField.enumValues.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : selectedField?.valueType === "boolean" ? (
              <Select
                value={String(value.value)}
                onValueChange={(next) =>
                  onChange({
                    ...value,
                    value: next === "true",
                  })
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">True</SelectItem>
                  <SelectItem value="false">False</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={selectedField?.valueType === "number" ? "number" : "text"}
                value={String(value.value ?? "")}
                onChange={(event) =>
                  onChange({
                    ...value,
                    value:
                      selectedField?.valueType === "number"
                        ? Number(event.target.value)
                        : event.target.value,
                  })
                }
                disabled={disabled}
              />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
