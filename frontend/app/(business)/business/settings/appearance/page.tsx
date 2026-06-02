"use client";

import { PageHeader } from "@/components/layout/page-header";
import { DarkModeToggle } from "@/components/theme/dark-mode-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function BusinessSettingsAppearancePage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <PageHeader description="Personal display preferences for this device." />
      <Card className="w-full max-w-none">
        <CardHeader>
          <CardTitle className="text-base">Theme</CardTitle>
          <CardDescription>
            Switch between light and dark mode. This applies to your browser
            session only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DarkModeToggle variant="switch" />
        </CardContent>
      </Card>
    </div>
  );
}
