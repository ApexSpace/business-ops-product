"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { invalidateBusinessMembers } from "@/lib/query/invalidation";
import {
  removeMemberTimeClockPin,
  setMemberTimeClockPin,
} from "@/features/settings/api/business.api";
import type { BusinessMember } from "@/features/settings/types";

type MemberTimeClockPinDialogProps = {
  member: BusinessMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MemberTimeClockPinDialog({
  member,
  open,
  onOpenChange,
}: MemberTimeClockPinDialogProps) {
  const queryClient = useQueryClient();
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [editing, setEditing] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => setMemberTimeClockPin(member!.userId, pin),
    onSuccess: async () => {
      toast.success("Time clock PIN saved");
      await invalidateBusinessMembers(queryClient);
      setPin("");
      setEditing(false);
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: () => removeMemberTimeClockPin(member!.userId),
    onSuccess: async () => {
      toast.success("Time clock PIN removed");
      await invalidateBusinessMembers(queryClient);
      setEditing(false);
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const memberName =
    [member?.user.firstName, member?.user.lastName].filter(Boolean).join(" ") ||
    member?.user.email;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setPin("");
          setEditing(false);
          setShowPin(false);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Time Clock PIN</DialogTitle>
          <DialogDescription>
            A 4-digit PIN used to clock in and out at the time clock
            {memberName ? ` for ${memberName}` : ""}.
          </DialogDescription>
        </DialogHeader>

        {member?.hasTimeclockPin && !editing ? (
          <div className="space-y-3">
            <div className="rounded-md border px-3 py-2 font-mono tracking-widest">
              ••••
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(true)}>
                Change PIN
              </Button>
              <Button
                variant="ghost"
                disabled={removeMutation.isPending}
                onClick={() => removeMutation.mutate()}
              >
                Remove PIN
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="timeclock-pin">PIN</Label>
            <div className="relative">
              <Input
                id="timeclock-pin"
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="1234"
                className="pr-10 tracking-widest"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0"
                onClick={() => setShowPin((v) => !v)}
              >
                {showPin ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {editing || !member?.hasTimeclockPin ? (
          <DialogFooter>
            <Button
              disabled={pin.length !== 4 || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              Save PIN
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
