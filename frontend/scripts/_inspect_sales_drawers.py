from pathlib import Path

root = Path(r"S:\Programming\FreeLProj\business-ops-product\frontend")

api = (root / "features/sales/api/checkouts.api.ts").read_text(encoding="utf-8")
print(api[:500])
print("==== entity detail ====")
ed = (root / "components/layout/entity-detail-drawer.tsx").read_text(encoding="utf-8")
i = ed.find("interface EntityDetailDrawerProps")
print(ed[i : i + 900])
print("==== money import ====")
ws = (root / "features/sales/components/sales-workspace.tsx").read_text(encoding="utf-8")
for line in ws.splitlines():
    if "formatMoney" in line or "formatCurrency" in line or "payments" in line.lower() and "import" in line:
        print(line)
print("==== icon button exists ====")
print((root / "components/ui/icon-button.tsx").exists())
print("==== drawer shell headerActions sample from create ====")
create = (root / "features/appointments/components/drawer/appointment-create-drawer.tsx").read_text(
    encoding="utf-8"
)
for i, line in enumerate(create.splitlines(), 1):
    if "DrawerShell" in line or "spineLabel" in line or "headerActions" in line or "DrawerHeaderContent" in line:
        if i < 560:
            print(f"{i}:{line.strip()[:140]}")
