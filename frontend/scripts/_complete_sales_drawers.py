from __future__ import annotations

import re
from pathlib import Path

root = Path(r"S:\Programming\FreeLProj\business-ops-product\frontend")

# Fix NewCheckoutDrawer select import/name to SearchableSelect
ncd = root / "features/sales/components/new-checkout-drawer.tsx"
t = ncd.read_text(encoding="utf-8")
t = t.replace("SearchableSelect", "SearchableSelect")
# If I accidentally used wrong name:
t = t.replace(
    'from "@/components/forms/searchable-select"',
    'from "@/components/forms/searchable-select"',
)
# Force correct component name based on export SearchableSelect
t = re.sub(r"\bSearchableSelect\b", "SearchableSelect", t)
# Wait - export is SearchableSelect. Ensure file uses that.
# Read current
print("before names", set(re.findall(r"Search\w*Select", t)))
ncd.write_text(t, encoding="utf-8")

# Actually rewrite the select usage cleanly
t = ncd.read_text(encoding="utf-8")
t = t.replace(
    'import { SearchableSelect } from "@/components/forms/searchable-select";',
    'import { SearchableSelect } from "@/components/forms/searchable-select";',
)
# if file has SearchableSelect from my write (wrong), fix:
if "SearchableSelect" in t and "export function SearchableSelect" not in (
    root / "components/forms/searchable-select.tsx"
).read_text(encoding="utf-8"):
    # export is SearchableSelect
    t = t.replace("SearchableSelect", "SearchableSelect")
ncd.write_text(t, encoding="utf-8")
print("ncd select names", set(re.findall(r"Search\w*Select", ncd.read_text(encoding="utf-8"))))

ws_path = root / "features/sales/components/sales-workspace.tsx"
text = ws_path.read_text(encoding="utf-8")

if "NewCheckoutDrawer" not in text:
    text = text.replace(
        '} from "@/features/sales/components/sales-options-drawer";\n',
        '} from "@/features/sales/components/sales-options-drawer";\n'
        'import { NewCheckoutDrawer } from "@/features/sales/components/new-checkout-drawer";\n',
    )
    print("import added")

text = text.replace(
    """  const openNewSale = () => {
    setNewContactId(contactFilter);
    setNewSaleOpen(true);
  };""",
    """  const openNewSale = () => {
    clearSelection();
    setSaleEditMode(false);
    setCheckoutStep("items");
    setPaymentAction(null);
    setNewContactId(contactFilter);
    setNewSaleOpen(true);
  };""",
)
print("openNewSale patched", "clearSelection();\n    setSaleEditMode" in text)

old_filters = """  const listFilters = useMemo(
    () => ({
      page,
      limit: PAGE_LIMIT,
      search: listSearch.trim() || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      contactId: contactFilter ?? undefined,
    }),
    [page, listSearch, statusFilter, contactFilter],
  );"""

new_filters = """  const listFilters = useMemo(
    () => ({
      page,
      limit: PAGE_LIMIT,
      search: listSearch.trim() || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      contactId: contactFilter ?? undefined,
      issueFrom: optionsValues.saleDate || undefined,
      issueTo: optionsValues.saleDate || undefined,
    }),
    [
      page,
      listSearch,
      statusFilter,
      contactFilter,
      optionsValues.saleDate,
    ],
  );"""

if old_filters not in text:
    raise SystemExit("listFilters not found exact")
text = text.replace(old_filters, new_filters)
print("filters ok")

old_apply = """        onApply={(next) => {
          setOptionsValues(next);
          setStatusFilter(next.status === "all" ? "all" : next.status);
          const search = next.saleNumber.trim() || next.clientQuery.trim();
          if (search) setListSearch(search);
          setPage(1);
        }}"""

new_apply = """        onApply={(next) => {
          setOptionsValues(next);
          setStatusFilter(next.status === "all" ? "all" : next.status);
          setListSearch(next.saleNumber.trim() || next.clientQuery.trim());
          setPage(1);
          toast.success("Filters applied");
        }}"""

if old_apply not in text:
    raise SystemExit("options apply not found")
text = text.replace(old_apply, new_apply)
print("apply ok")

dialog_pat = re.compile(
    r"<Dialog open=\{newSaleOpen\} onOpenChange=\{setNewSaleOpen\}>[\s\S]*?</Dialog>",
    re.M,
)
replacement = """<NewCheckoutDrawer
        open={newSaleOpen}
        onOpenChange={setNewSaleOpen}
        contactItems={contactItems}
        contactId={newContactId}
        onContactIdChange={setNewContactId}
        onCreate={() => createMutation.mutate()}
        isPending={createMutation.isPending}
      />"""
m = dialog_pat.search(text)
if not m:
    raise SystemExit("dialog not found")
text = text[: m.start()] + replacement + text[m.end() :]
print("dialog replaced")

if "<Dialog" not in text:
    text = re.sub(
        r"import \{\n  Dialog,\n  DialogContent,\n  DialogHeader,\n  DialogTitle,\n\} from \"@/components/ui/dialog\";\n",
        "",
        text,
        count=1,
    )
    print("dialog imports removed")

ws_path.write_text(text, encoding="utf-8")
print("done", ws_path.stat().st_size)
