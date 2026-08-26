"use client";

import { DrawerAddAction } from "@/components/drawer/drawer-add-action";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SALES_DRAWER_ADD_ACTION_CLASS,
  SALES_DRAWER_ADD_ACTIONS_STACK_CLASS,
} from "@/features/sales/styles/sales-drawer-tokens";
import type { InlineAddMode } from "@/features/sales/hooks/use-checkout-panel";
import { cn } from "@/lib/utils";

export type CheckoutMoreMode = Exclude<
  InlineAddMode,
  "service" | "product" | null
>;

export interface CheckoutAddActionsProps {
  onAddService: () => void;
  onAddProduct: () => void;
  onMoreSelect: (mode: CheckoutMoreMode) => void;
  disabled?: boolean;
  className?: string;
}

export function CheckoutAddActions({
  onAddService,
  onAddProduct,
  onMoreSelect,
  disabled = false,
  className,
}: CheckoutAddActionsProps) {
  return (
    <div className={cn(SALES_DRAWER_ADD_ACTIONS_STACK_CLASS, className)}>
      <DrawerAddAction
        label="Add Service"
        onClick={onAddService}
        className={disabled ? "pointer-events-none opacity-50" : undefined}
      />
      <DrawerAddAction
        label="Add Product"
        onClick={onAddProduct}
        className={disabled ? "pointer-events-none opacity-50" : undefined}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          render={
            <button
              type="button"
              disabled={disabled}
              className={cn(
                SALES_DRAWER_ADD_ACTION_CLASS,
                disabled && "pointer-events-none opacity-50",
              )}
            >
              More
            </button>
          }
        />
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuItem onClick={() => onMoreSelect("giftCard")}>
            Gift card
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMoreSelect("package")}>
            Package
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMoreSelect("offer")}>
            Offer
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMoreSelect("accountBalance")}>
            Account balance
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
