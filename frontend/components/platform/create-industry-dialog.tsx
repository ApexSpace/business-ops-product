"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IndustryFormDialog } from "@/components/platform/industry-form-dialog";

export function CreateIndustryDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="mr-2 size-4" />
        Add industry
      </Button>
      <IndustryFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
