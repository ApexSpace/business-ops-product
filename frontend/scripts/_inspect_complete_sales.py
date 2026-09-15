from pathlib import Path
import re

ws = Path(
    r"S:\Programming\FreeLProj\business-ops-product\frontend\features\sales\components\sales-workspace.tsx"
).read_text(encoding="utf-8")
print("open fns", re.findall(r"const (open\w+)\s*=", ws)[:10])
print(
    "new sale ids",
    sorted(set(re.findall(r"new(?:Sale|Contact)\w*", ws)))[:20],
)
print("create mut", sorted(set(re.findall(r"create\w*Mutation", ws))))
print("optionsValues", "optionsValues" in ws)
print("optionsValues", "optionsValues" in ws)
print("PAGE", re.findall(r"PAGE_\w+|const PAGE\w*", ws)[:8])
print("clearSelection", "clearSelection" in ws)
print("toast import", "sonner" in ws)
i = ws.find("const listFilters")
print("FILTERS:\n", ws[i : i + 380])
i = ws.find("const open")
# find openNew specifically
for m in re.finditer(r"const open\w+ = \(\) => \{[\s\S]*?\n  \};", ws):
    if "Sale" in m.group(0) or "new" in m.group(0).lower():
        print("OPEN BLOCK:\n", m.group(0))
        break
opts = Path(
    r"S:\Programming\FreeLProj\business-ops-product\frontend\features\sales\components\sales-options-drawer.tsx"
).read_text(encoding="utf-8")
print("option fields", re.findall(r"^\s+(\w+):", opts, re.M)[:20])
ss = Path(
    r"S:\Programming\FreeLProj\business-ops-product\frontend\components\forms\searchable-select.tsx"
).read_text(encoding="utf-8")
print("select export", re.findall(r"export function (\w+)", ss))
print("Dialog block present", "<Dialog open={newSaleOpen}" in ws or "newSaleOpen" in ws)
print("newSaleOpen variants", [x for x in ["newSaleOpen", "newSaleOpen"] if x in ws])
