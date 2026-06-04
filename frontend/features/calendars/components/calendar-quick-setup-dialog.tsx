"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormSchemaProvider,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/forms/searchable-select";
import {
  DURATION_PRESETS,
  quickSetupSchema,
  slugifyCalendarName,
  type CalendarCreationTypeOption,
  type QuickSetupValues,
} from "@/features/calendars/schemas/calendar-profile";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";
import type { BusinessMember, PaginatedResult } from "@/lib/types/shared";
import { listBusinessMembers } from "@/features/settings/api/business.api";

interface CalendarQuickSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendarType: CalendarCreationTypeOption | null;
  isPending?: boolean;
  onBack: () => void;
  onCreate: (values: QuickSetupValues) => void;
  onAdvancedSettings: (values: QuickSetupValues) => void;
}

export function CalendarQuickSetupDialog({
  open,
  onOpenChange,
  calendarType,
  isPending = false,
  onBack,
  onCreate,
  onAdvancedSettings,
}: CalendarQuickSetupDialogProps) {
  const form = useForm<QuickSetupValues>({
    resolver: zodResolver(quickSetupSchema),
    defaultValues: {
      name: "",
      description: "",
      primaryStaffUserId: "",
      defaultDurationMinutes: 30,
      bookingSlug: "",
    },
  });

  const { data: members } = useQuery({
    queryKey: queryKeys.business.members({ page: 1, limit: 100 }),
    queryFn: () =>
      listBusinessMembers({ page: 1, limit: 100 }),
    enabled: open && !!calendarType?.showPrimaryStaff,
  });

  const name = form.watch("name");

  useEffect(() => {
    if (!open) {
      form.reset({
        name: "",
        description: "",
        primaryStaffUserId: "",
        defaultDurationMinutes: 30,
        bookingSlug: "",
      });
    }
  }, [open, form]);

  useEffect(() => {
    const slug = form.getValues("bookingSlug");
    if (!slug && name) {
      form.setValue("bookingSlug", slugifyCalendarName(name), {
        shouldDirty: true,
      });
    }
  }, [name, form]);

  const memberOptions =
    members?.items.map((m) => ({
      value: m.userId,
      label:
        [m.user.firstName, m.user.lastName].filter(Boolean).join(" ") ||
        m.user.email,
    })) ?? [];

  const handleSubmit = (values: QuickSetupValues, mode: "create" | "advanced") => {
    if (mode === "create") onCreate(values);
    else onAdvancedSettings(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Quick calendar setup</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {calendarType
              ? `${calendarType.title} — add the basics now. Fine-tune everything later if needed.`
              : "Add the basics to get booking live in under a minute."}
          </p>
        </DialogHeader>
        <Form {...form}>
          <FormSchemaProvider schema={quickSetupSchema}>
            <form
              onSubmit={form.handleSubmit((values) => handleSubmit(values, "create"))}
              className="contents"
            >
            <DialogBody className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calendar name</FormLabel>
                    <FormControl>
                      <Input placeholder="Consultation calendar" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="Optional — shown on your booking page"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {calendarType?.showPrimaryStaff ? (
                <FormField
                  control={form.control}
                  name="primaryStaffUserId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary staff</FormLabel>
                      <SearchableSelect
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        items={[
                          { value: "", label: "Select team member (optional)" },
                          ...memberOptions,
                        ]}
                        placeholder="Assign primary host"
                      />
                      <FormDescription>
                        You can add more staff in advanced settings.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
              <FormField
                control={form.control}
                name="defaultDurationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting duration</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {DURATION_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => field.onChange(preset.value)}
                          className={cn(
                            "rounded-md border px-3 py-1.5 text-sm transition-colors",
                            field.value === preset.value
                              ? "border-primary bg-primary/10 font-medium text-primary"
                              : "border-border hover:bg-muted/50",
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bookingSlug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom URL slug</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-0 overflow-hidden rounded-md border border-input bg-background">
                        <span className="shrink-0 border-r bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                          /book/
                        </span>
                        <Input
                          className="border-0 shadow-none focus-visible:ring-0"
                          placeholder="consultation"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Shareable booking link path for this calendar.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </DialogBody>
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onBack}
                  disabled={isPending}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isPending}
                  onClick={form.handleSubmit((values) =>
                    handleSubmit(values, "advanced"),
                  )}
                >
                  Advanced settings
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Creating…" : "Create calendar"}
                </Button>
              </div>
            </DialogFooter>
            </form>
          </FormSchemaProvider>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
