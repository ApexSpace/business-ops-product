from pathlib import Path

p = Path(
    r"S:\Programming\FreeLProj\business-ops-product\frontend\features\sales\components\sales-options-drawer.tsx"
)
t = p.read_text(encoding="utf-8")
t = t.replace(
    'import { useEffect, useState } from "react";\n',
    'import { useState } from "react";\n',
)
old = """  const [draft, setDraft] = useState<SalesOptionsValues>(values);

  useEffect(() => {
    if (open) setDraft(values);
  }, [open, values]);
"""
new = """  const [draft, setDraft] = useState<SalesOptionsValues>(values);

  const handleOpenChange = (next: boolean) => {
    if (next) setDraft(values);
    onOpenChange(next);
  };
"""
if old not in t:
    raise SystemExit("effect block not found:\n" + t[t.find("const [draft") : t.find("const [draft") + 250])
t = t.replace(old, new)
t = t.replace("onOpenChange={onOpenChange}", "onOpenChange={handleOpenChange}", 1)
p.write_text(t, encoding="utf-8")
print("options drawer fixed")

# unused imports in workspace
ws = Path(
    r"S:\Programming\FreeLProj\business-ops-product\frontend\features\sales\components\sales-workspace.tsx"
)
w = ws.read_text(encoding="utf-8")
w2 = w.replace("  Check,\n", "")
# remove statusFilterItems const if unused
import re

w2, n = re.subn(
    r"\n  const statusFilterItems = \[[\s\S]*?\];\n",
    "\n",
    w2,
    count=1,
)
print("removed statusFilterItems", n)
if w2 != w:
    ws.write_text(w2, encoding="utf-8")
    print("workspace cleaned")
else:
    print("workspace unchanged")
