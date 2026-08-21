from pathlib import Path

root = Path(r"S:\Programming\FreeLProj\business-ops-product\frontend")
ws = (root / "features/sales/components/sales-workspace.tsx").read_text(encoding="utf-8")
print("saleSpineLabel def", "const saleSpineLabel" in ws)
print("saleSpineLabel use", "spineLabel={saleSpineLabel}" in ws)
print("saleDrawerHeading def", "const saleDrawerHeading" in ws)
print("saleDrawerHeading use", "saleDrawerHeading" in ws)
print("MoreHorizontal", "MoreHorizontal" in ws)
print("DrawerPrimaryButton", "DrawerPrimaryButton" in ws)
print("IconButton", "IconButton" in ws)
print("DrawerHeaderContent", "DrawerHeaderContent" in ws)

appt = (root / "features/appointments/styles/appointment-drawer-tokens.ts").read_text(
    encoding="utf-8"
)
print(
    "appt spine reexport",
    "DRAWER_SPINE_CLASS as APPOINTMENT_DRAWER_SPINE_CLASS" in appt,
)

spine = (root / "components/drawer/drawer-spine.tsx").read_text(encoding="utf-8")
print("spine uses shared", "DRAWER_SPINE_CLASS" in spine)
print("spine import path", "@/lib/design/drawer-shell-tokens" in spine)

closed = (root / "features/sales/components/sale-closed-drawer-content.tsx").read_text(
    encoding="utf-8"
)
opts = (root / "features/sales/components/sales-options-drawer.tsx").read_text(
    encoding="utf-8"
)
tokens = (root / "features/sales/styles/sales-drawer-tokens.ts").read_text(encoding="utf-8")

# validate token names used by closed/options exist in tokens file
for name in [
    "SALES_DRAWER_CLIENT_AVATAR_CLASS",
    "SALES_DRAWER_CLIENT_CARD_CLASS",
    "SALES_DRAWER_FORM_FIELDS_CLASS",
    "SALES_DRAWER_SPINE_LABELS",
    "SALES_DRAWER_SHELL_HEADER_CLASS",
]:
    print(name, "in tokens", name in tokens, "closed", name in closed, "opts", name in opts)

# payments items shape
print("closed payments items", "paymentsData?.items" in closed or ".items" in closed)
print("queryKeys", "queryKeys" in closed)
