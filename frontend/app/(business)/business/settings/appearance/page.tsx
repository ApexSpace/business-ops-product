"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { SettingsFormPage } from "@/components/layout/settings-page-layout";
import { SettingsToggleSection } from "@/components/layout/settings-toggle-section";
import { SETTINGS_FORM_SECTION_STACK_CLASS } from "@/lib/design/settings-form-tokens";

export default function BusinessSettingsAppearancePage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  return (
    <SettingsFormPage>
      <div className={SETTINGS_FORM_SECTION_STACK_CLASS}>
        <SettingsToggleSection
          id="appearance-dark-mode"
          title="Dark mode"
          description="Switch between light and dark appearance for the business app."
          checked={mounted && isDark}
          onCheckedChange={(checked) =>
            setTheme(checked ? "dark" : "light")
          }
          disabled={!mounted}
        />
      </div>
    </SettingsFormPage>
  );
}
