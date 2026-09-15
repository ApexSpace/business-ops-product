"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  applySetNotWorking,
  previewSetNotWorking,
  type SetNotWorkingBody,
  type SetNotWorkingPreview,
} from "@/features/quick-tools/api/quick-tools.api";
import { QuickToolsStaffMultiSelect } from "@/features/quick-tools/components/quick-tools-staff-multi-select";
import { QuickToolsPreviewSummary } from "@/features/quick-tools/components/quick-tools-preview-summary";

type DateMode = "single" | "range";

type SetNotWorkingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SetNotWorkingDialog({
  open,
  onOpenChange,
}: SetNotWorkingDialogProps) {
  const [staffUserIds, setStaffUserIds] = useState<string[]>([]);
  const [dateMode, setDateMode] = useState<DateMode>("single");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<SetNotWorkingPreview | null>(null);
  const [step, setStep] = useState<"form" | "confirm">("form");

  const reset = useCallback(() => {
    setStaffUserIds([]);
    setDateMode("single");
    setFromDate("");
    setToDate("");
    setReason("");
    setPreview(null);
    setStep("form");
  }, []);

  const buildBody = useCallback((): SetNotWorkingBody | null => {
    if (!fromDate || staffUserIds.length === 0) return null;
    return {
      staffUserIds,
      fromDate,
      ...(dateMode === "range" && toDate ? { toDate } : {}),
      ...(reason.trim() ? { reason: reason.trim() } : {}),
    };
  }, [dateMode, fromDate, reason, staffUserIds, toDate]);

  const previewMutation = useMutation({
    mutationFn: previewSetNotWorking,
    onSuccess: (data) => {
      setPreview(data);
      setStep("confirm");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const applyMutation = useMutation({
    mutationFn: applySetNotWorking,
    onSuccess: (data) => {
      toast.success(
        `Marked ${data.exceptionsCreated} day${data.exceptionsCreated === 1 ? "" : "s"} as not working`,
      );
      onOpenChange(false);
      reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handlePreview() {
    const body = buildBody();
    if (!body) {
      toast.error("Select at least one staff member and a date");
      return;
    }
    if (dateMode === "range" && toDate && toDate < fromDate) {
      toast.error("End date must be on or after start date");
      return;
    }
    previewMutation.mutate(body);
  }

  function handleConfirm() {
    const body = buildBody();
    if (!body) return;
    applyMutation.mutate(body);
  }

  const isBusy = previewMutation.isPending || applyMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Set Staff to &quot;Not Working&quot;</DialogTitle>
        </DialogHeader>

        {step === "form" ? (
          <div className="space-y-4">
            <QuickToolsStaffMultiSelect
              value={staffUserIds}
              onChange={setStaffUserIds}
              disabled={isBusy}
            />

            <div className="space-y-2">
              <Label>Date</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={dateMode === "single" ? "default" : "outline"}
                  onClick={() => setDateMode("single")}
                >
                  Single day
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={dateMode === "range" ? "default" : "outline"}
                  onClick={() => setDateMode("range")}
                >
                  Date range
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label required>
                  {dateMode === "range" ? "From" : "Date"}
                </Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  disabled={isBusy}
                />
              </div>
              {dateMode === "range" ? (
                <div className="space-y-1.5">
                  <Label required>To</Label>
                  <Input
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    onChange={(e) => setToDate(e.target.value)}
                    disabled={isBusy}
                  />
                </div>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="set-not-working-reason">Reason (optional)</Label>
              <Textarea
                id="set-not-working-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={3}
                disabled={isBusy}
                placeholder="Vacation, training, etc."
              />
            </div>
          </div>
        ) : preview ? (
          <QuickToolsPreviewSummary
            mode="set"
            preview={preview}
            staffCount={staffUserIds.length}
          />
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "confirm" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("form")}
              disabled={isBusy}
            >
              Back
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isBusy}
            >
              Cancel
            </Button>
          )}
          {step === "form" ? (
            <Button
              type="button"
              onClick={handlePreview}
              disabled={isBusy}
            >
              {previewMutation.isPending ? "Previewing…" : "Preview"}
            </Button>
          ) : (
            <Button type="button" onClick={handleConfirm} disabled={isBusy}>
              {applyMutation.isPending ? "Applying…" : "Confirm"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
