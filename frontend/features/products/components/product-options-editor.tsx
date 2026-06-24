"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createProductOption,
  createProductOptionValue,
} from "@/features/products/api/products.api";
import type { ProductOption } from "@/features/products/types";
import { invalidateProductDetail } from "@/lib/query/invalidation";

export function ProductOptionsEditor({
  productId,
  options,
}: {
  productId: string;
  options: ProductOption[];
}) {
  const queryClient = useQueryClient();
  const [optionName, setOptionName] = useState("");
  const [valueInputs, setValueInputs] = useState<Record<string, string>>({});

  const addOption = useMutation({
    mutationFn: (name: string) => createProductOption(productId, { name }),
    onSuccess: () => {
      toast.success("Option added");
      setOptionName("");
      void invalidateProductDetail(queryClient, productId);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addValue = useMutation({
    mutationFn: ({
      optionId,
      value,
    }: {
      optionId: string;
      value: string;
    }) => createProductOptionValue(productId, optionId, { value }),
    onSuccess: (_data, vars) => {
      toast.success("Value added");
      setValueInputs((prev) => ({ ...prev, [vars.optionId]: "" }));
      void invalidateProductDetail(queryClient, productId);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Options</p>
      {options.length > 0 ? (
        <ul className="space-y-3 text-sm">
          {options.map((opt) => (
            <li key={opt.id} className="rounded border p-2">
              <p className="font-medium">{opt.name}</p>
              <p className="text-xs text-muted-foreground">
                {opt.values.map((v) => v.value).join(", ") || "No values yet"}
              </p>
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder={`Add ${opt.name} value`}
                  value={valueInputs[opt.id] ?? ""}
                  onChange={(e) =>
                    setValueInputs((prev) => ({
                      ...prev,
                      [opt.id]: e.target.value,
                    }))
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!valueInputs[opt.id]?.trim() || addValue.isPending}
                  onClick={() => {
                    const value = valueInputs[opt.id]?.trim();
                    if (!value) return;
                    addValue.mutate({ optionId: opt.id, value });
                  }}
                >
                  Add
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No options yet.</p>
      )}
      <div className="space-y-1">
        <Label>New option (e.g. Size, Color)</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Option name"
            value={optionName}
            onChange={(e) => setOptionName(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            disabled={!optionName.trim() || addOption.isPending}
            onClick={() => addOption.mutate(optionName.trim())}
          >
            Add option
          </Button>
        </div>
      </div>
    </div>
  );
}
