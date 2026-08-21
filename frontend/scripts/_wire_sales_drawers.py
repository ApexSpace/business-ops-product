from __future__ import annotations

import re
from pathlib import Path

ws_path = Path(
    r"S:\Programming\FreeLProj\business-ops-product\frontend\features\sales\components\sales-workspace.tsx"
)
text = ws_path.read_text(encoding="utf-8")

# ---------------------------------------------------------------------------
# Imports
# ---------------------------------------------------------------------------
text = text.replace(
    'import { EntityDetailDrawer } from "@/components/layout/entity-detail-drawer";\n',
    'import { DrawerShell } from "@/components/layout/drawer-shell";\n'
    'import { DrawerHeaderContent } from "@/components/drawer/drawer-header-content";\n'
    'import { DrawerPrimaryButton } from "@/components/drawer/drawer-primary-button";\n'
    'import { IconButton } from "@/components/ui/icon-button";\n',
)
text = text.replace(
    'import { EntityDetailFooter } from "@/components/layout/entity-detail-footer";\n',
    "",
)
text = text.replace(
    'import { ListFiltersPopover } from "@/components/layout/list-filters-popover";\n',
    "",
)

if "SaleClosedDrawerContent" not in text:
    text = text.replace(
        '} from "@/features/sales/components/checkout-drawer-panel";\n',
        '} from "@/features/sales/components/checkout-drawer-panel";\n'
        "import {\n"
        "  SaleClosedDrawerContent,\n"
        "  saleDrawerTitle,\n"
        '} from "@/features/sales/components/sale-closed-drawer-content";\n'
        "import {\n"
        "  EMPTY_SALES_OPTIONS,\n"
        "  SalesOptionsDrawer,\n"
        "  type SalesOptionsValues,\n"
        '} from "@/features/sales/components/sales-options-drawer";\n'
        "import {\n"
        "  SALES_DRAWER_FOOTER_CLASS,\n"
        "  SALES_DRAWER_FOOTER_INNER_CLASS,\n"
        "  SALES_DRAWER_HEADER_ACTION_CLASS,\n"
        "  SALES_DRAWER_SHELL_CLASS,\n"
        "  SALES_DRAWER_SHELL_HEADER_CLASS,\n"
        "  SALES_DRAWER_SPINE_LABELS,\n"
        '} from "@/features/sales/styles/sales-drawer-tokens";\n',
    )

if "SlidersHorizontal" not in text:
    text = re.sub(
        r'(import \{\n(?:  \w+,\n)+)(} from "lucide-react";)',
        r"\1  MoreHorizontal,\n  SlidersHorizontal,\n\2",
        text,
        count=1,
    )

# ---------------------------------------------------------------------------
# State + filters button
# ---------------------------------------------------------------------------
if "optionsOpen" not in text:
    text = text.replace(
        '  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");\n',
        '  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");\n'
        "  const [optionsOpen, setOptionsOpen] = useState(false);\n"
        "  const [optionsValues, setOptionsValues] =\n"
        "    useState<SalesOptionsValues>(EMPTY_SALES_OPTIONS);\n",
    )

text, n_filters = re.subn(
    r"<ListFiltersPopover[\s\S]*?/>",
    """<IconButton
            type="button"
            variant="outline"
            aria-label="Sale options"
            className="size-11 shrink-0"
            onClick={() => setOptionsOpen(true)}
          >
            <SlidersHorizontal className="size-4" />
          </IconButton>""",
    text,
    count=1,
)
print("filters", n_filters)

# ---------------------------------------------------------------------------
# Spine helpers
# ---------------------------------------------------------------------------
if "saleSpineLabel" not in text:
    helpers = """
  const saleSpineLabel = !sale
    ? SALES_DRAWER_SPINE_LABELS.sale
    : saleEditMode
      ? SALES_DRAWER_SPINE_LABELS.sale
      : !sale.isOpen
        ? SALES_DRAWER_SPINE_LABELS.sale
        : checkoutStep === "payment"
          ? SALES_DRAWER_SPINE_LABELS.payment
          : SALES_DRAWER_SPINE_LABELS.checkout;

  const saleDrawerHeading = !sale
    ? "Sale"
    : saleEditMode
      ? "Edit sale"
      : !sale.isOpen
        ? saleDrawerTitle(sale)
        : checkoutStep === "payment"
          ? "Payment"
          : "Checkout";

"""
    m = re.search(r"\n  return \(\n\s*<>", text)
    if not m:
        raise SystemExit("return not found")
    text = text[: m.start()] + "\n" + helpers + text[m.start() :]
    print("helpers ok")

# ---------------------------------------------------------------------------
# Replace EntityDetailDrawer
# ---------------------------------------------------------------------------
start = text.find("<EntityDetailDrawer")
end = text.find("</EntityDetailDrawer>")
if start < 0 or end < 0:
    raise SystemExit("EntityDetailDrawer missing")
end_close = end + len("</EntityDetailDrawer>")
old = text[start:end_close]

# children between > of opening tag and closing tag
# find first `>` of the opening tag that is followed by newline+spaces+{
open_gt = old.find("\n      >\n")
if open_gt < 0:
    raise SystemExit("could not find drawer open tag end")
children = old[open_gt + len("\n      >\n") : -len("</EntityDetailDrawer>")].rstrip(
    "\n"
)

# Insert closed-sale branch before CheckoutDrawerPanel
if "SaleClosedDrawerContent" not in children:
    children = children.replace(
        ") : (\n            <CheckoutDrawerPanel",
        ") : !sale.isOpen ? (\n"
        "            <SaleClosedDrawerContent sale={sale} />\n"
        "          ) : (\n"
        "            <CheckoutDrawerPanel",
        1,
    )
    print("closed branch inserted into children")

new_drawer = f"""<DrawerShell
        open={{isOpen}}
        onOpenChange={{(open) => {{
          if (!open) {{
            clearSelection();
            setSaleEditMode(false);
            setEditingLine(null);
            setCheckoutStep("items");
            setPaymentAction(null);
          }}
        }}}}
        variant="sheet"
        width="appointment"
        spineLabel={{saleSpineLabel}}
        className={{SALES_DRAWER_SHELL_CLASS}}
        headerClassName={{SALES_DRAWER_SHELL_HEADER_CLASS}}
        contentClassName="!px-0 !py-0"
        footerClassName={{
          sale?.isOpen && saleDetailProps && canCheckout
            ? SALES_DRAWER_FOOTER_CLASS
            : undefined
        }}
        title={{<DrawerHeaderContent title={{saleDrawerHeading}} />}}
        headerActions={{
          <>
            {{sale?.isOpen && saleDetailProps && canCheckout && !saleEditMode ? (
              <IconButton
                type="button"
                variant="ghost"
                aria-label="Edit sale"
                className={{SALES_DRAWER_HEADER_ACTION_CLASS}}
                onClick={{saleDetailProps.onEdit}}
              >
                <Pencil className="size-4" />
              </IconButton>
            ) : null}}
            {{sale?.isOpen && saleDetailProps && canCheckout && !saleEditMode ? (
              <IconButton
                type="button"
                variant="ghost"
                aria-label="Void sale"
                className={{SALES_DRAWER_HEADER_ACTION_CLASS}}
                onClick={{saleDetailProps.onVoid}}
              >
                <Trash2 className="size-4" />
              </IconButton>
            ) : (
              <IconButton
                type="button"
                variant="ghost"
                aria-label="More actions"
                className={{SALES_DRAWER_HEADER_ACTION_CLASS}}
              >
                <MoreHorizontal className="size-4" />
              </IconButton>
            )}}
          </>
        }}
        footer={{
          sale?.isOpen && saleDetailProps && canCheckout ? (
            saleEditMode ? (
              <div className={{SALES_DRAWER_FOOTER_INNER_CLASS}}>
                <div className="flex w-full gap-2">
                  <Button
                    variant="outline"
                    className="min-h-12 flex-1"
                    disabled={{updateSaleMutation.isPending}}
                    onClick={{cancelEditSale}}
                  >
                    Cancel
                  </Button>
                  <DrawerPrimaryButton
                    disabled={{!editContactId || updateSaleMutation.isPending}}
                    onClick={{() => updateSaleMutation.mutate()}}
                  >
                    {{updateSaleMutation.isPending ? "Saving…" : "Save changes"}}
                  </DrawerPrimaryButton>
                </div>
              </div>
            ) : checkoutStep === "payment" && paymentAction ? (
              <div className={{SALES_DRAWER_FOOTER_INNER_CLASS}}>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={{() => {{
                    setCheckoutStep("items");
                    setPaymentAction(null);
                  }}}}
                >
                  Back to items
                </Button>
                <DrawerPrimaryButton
                  disabled={{paymentAction.disabled}}
                  onClick={{paymentAction.onClick}}
                >
                  {{paymentAction.label}}
                </DrawerPrimaryButton>
              </div>
            ) : (
              <div className={{SALES_DRAWER_FOOTER_INNER_CLASS}}>
                <DrawerPrimaryButton onClick={{() => setCheckoutStep("payment")}}>
                  Go to payments
                </DrawerPrimaryButton>
              </div>
            )
          ) : null
        }}
      >
        {{detailLoading ? (
          <div className="flex flex-1 items-center justify-center py-16 text-sm text-muted-foreground">
            Loading sale…
          </div>
        ) : (
          {children.strip()}
        )}}
      </DrawerShell>"""

text = text[:start] + new_drawer + text[end_close:]
print("drawer swapped")

if "<SalesOptionsDrawer" not in text:
    options = """

      <SalesOptionsDrawer
        open={optionsOpen}
        onOpenChange={setOptionsOpen}
        values={optionsValues}
        onApply={(next) => {
          setOptionsValues(next);
          setStatusFilter(next.status === "all" ? "all" : next.status);
          const search = next.saleNumber.trim() || next.clientQuery.trim();
          if (search) setListSearch(search);
          setPage(1);
        }}
      />
"""
    idx = text.find("      </DrawerShell>")
    if idx < 0:
        raise SystemExit("DrawerShell close missing")
    at = idx + len("      </DrawerShell>")
    text = text[:at] + options + text[at:]
    print("options added")

ws_path.write_text(text, encoding="utf-8")
print("ok bytes", ws_path.stat().st_size)
