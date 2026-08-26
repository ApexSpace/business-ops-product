"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ShellNewAppointmentAction() {
  return (
    <Link
      href="/business/appointments?action=create"
      className={cn(buttonVariants(), "shrink-0")}
    >
      New appointment
    </Link>
  );
}
