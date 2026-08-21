from __future__ import annotations

import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]

# ---------------------------------------------------------------------------
# 1) Shared spine tokens
# ---------------------------------------------------------------------------
tokens = root / "lib/design/drawer-shell-tokens.ts"
text = tokens.read_text(encoding="utf-8")
spine_block = """
/**
 * Shared drawer purpose spine — Figma: 30px · primary/500 · rounded top-left + bottom-left only.
 * Used by appointments (NEW APPOINTMENT, …) and sales (SALE, OPTIONS, CHECKOUT, PAYMENT).
 */
export const DRAWER_SPINE_CLASS =
  "flex w-[30px] shrink-0 flex-col items-center justify-center self-stretch rounded-l-[12px] bg-violet-primary-normal";

export const DRAWER_SPINE_LABEL_CLASS =
  "pointer-events-none select-none text-[10px] font-bold uppercase tracking-[0.14em] text-white";

"""
if "DRAWER_SPINE_CLASS" not in text:
    marker = "/** Full-width primary CTA sizing"
    if marker in text:
        text = text.replace(marker, spine_block + marker)
    else:
        text = text.rstrip() + "\n" + spine_block
    tokens.write_text(text, encoding="utf-8")
    print("updated drawer-shell-tokens")
else:
    print("spine already in drawer-shell-tokens")

# ---------------------------------------------------------------------------
# 2) Appointment aliases → shared
# ---------------------------------------------------------------------------
appt = root / "features/appointments/styles/appointment-drawer-tokens.ts"
appt_text = appt.read_text(encoding="utf-8")
pat = re.compile(
    r"/\*\* Spine:.*?export const APPOINTMENT_DRAWER_SPINE_CLASS =\n  \"[^\"]+\";\n\nexport const APPOINTMENT_DRAWER_SPINE_LABEL_CLASS =\n  \"[^\"]+\";",
    re.S,
)
new_spine = """/** @deprecated Prefer DRAWER_SPINE_* from drawer-shell-tokens — same Figma spine. */
export {
  DRAWER_SPINE_CLASS as APPOINTMENT_DRAWER_SPINE_CLASS,
  DRAWER_SPINE_LABEL_CLASS as APPOINTMENT_DRAWER_SPINE_LABEL_CLASS,
} from "@/lib/design/drawer-shell-tokens";"""
m = pat.search(appt_text)
if m:
    appt.write_text(appt_text[: m.start()] + new_spine + appt_text[m.end() :], encoding="utf-8")
    print("updated appointment spine aliases")
elif "DRAWER_SPINE_CLASS as APPOINTMENT_DRAWER_SPINE_CLASS" in appt_text:
    print("appointment spine already aliased")
else:
    idx = appt_text.find("APPOINTMENT_DRAWER_SPINE_CLASS")
    print("WARN could not rewrite appointment spine; context:")
    print(repr(appt_text[max(0, idx - 80) : idx + 280]))

# ---------------------------------------------------------------------------
# 3) DrawerSpine → shared tokens
# ---------------------------------------------------------------------------
(root / "components/drawer/drawer-spine.tsx").write_text(
    '''"use client";

import {
  DRAWER_SPINE_CLASS,
  DRAWER_SPINE_LABEL_CLASS,
} from "@/lib/design/drawer-shell-tokens";
import { cn } from "@/lib/utils";

export interface DrawerSpineProps {
  label: string;
  className?: string;
}

/**
 * Left vertical purpose strip — shared by appointment + sales drawers.
 * Figma: 30px wide, primary/500, border-radius on top-left + bottom-left only.
 */
export function DrawerSpine({ label, className }: DrawerSpineProps) {
  return (
    <div className={cn(DRAWER_SPINE_CLASS, className)} aria-hidden>
      <span
        className={DRAWER_SPINE_LABEL_CLASS}
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {label}
      </span>
    </div>
  );
}
''',
    encoding="utf-8",
)
print("updated drawer-spine")

print("done phase 1")
