"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IndustryFormDialog } from "@/features/platform/components/industry-form-dialog";

export function CreateIndustryDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="brand" onClick={() => setOpen(true)}>
        Add industry
      </Button>
      <IndustryFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
