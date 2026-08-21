from pathlib import Path

ws_path = Path(
    r"S:\Programming\FreeLProj\business-ops-product\frontend\features\sales\components\sales-workspace.tsx"
)
ws = ws_path.read_text(encoding="utf-8")

old = """    onSuccess: (created) => {
      toast.success("Sale created");
      setNewSaleOpen(false);
      setNewContactId(contactFilter);
      void invalidateCheckouts(queryClient);
      setSelectedId(created.id);
    },"""

new = """    onSuccess: (created) => {
      toast.success("Sale created");
      setNewSaleOpen(false);
      setNewContactId(contactFilter);
      setCheckoutStep("items");
      setPaymentAction(null);
      setSaleEditMode(false);
      void invalidateCheckouts(queryClient);
      setSelectedId(created.id);
    },"""

if old not in ws:
    raise SystemExit("create onSuccess not found")
ws = ws.replace(old, new)
print("create onSuccess updated")

old_title = "title={<DrawerHeaderContent title={saleDrawerHeading} />}"
new_title = """title={
          <DrawerHeaderContent
            eyebrow={
              sale?.isOpen && !saleEditMode && sale.issueDate
                ? new Date(sale.issueDate)
                    .toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                    .toUpperCase()
                : undefined
            }
            title={saleDrawerHeading}
          />
        }"""
if old_title not in ws:
    raise SystemExit("title not found")
ws = ws.replace(old_title, new_title)
print("title eyebrow added")

ws_path.write_text(ws, encoding="utf-8")

opts = Path(
    r"S:\Programming\FreeLProj\business-ops-product\frontend\features\sales\components\sales-options-drawer.tsx"
).read_text(encoding="utf-8")
# ensure Apply label
if ">Download<" in opts:
    opts = opts.replace(">Download<", ">Apply<")
    Path(
        r"S:\Programming\FreeLProj\business-ops-product\frontend\features\sales\components\sales-options-drawer.tsx"
    ).write_text(opts, encoding="utf-8")
    print("options button -> Apply")
else:
    print("options already Apply / custom", "Apply" in opts)
