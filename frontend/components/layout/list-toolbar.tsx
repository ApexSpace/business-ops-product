import { cn } from "@/lib/utils";

import { DATA_TABLE_TOOLBAR_CLASS } from "@/lib/design/data-table-tokens";



interface ListToolbarProps {

  search?: React.ReactNode;

  filters?: React.ReactNode;

  actions?: React.ReactNode;

  className?: string;

}



/**

 * Universal list toolbar — Figma Sales pattern:

 * primary action(s) on the left; search + standalone filter icon on the right

 * with a clear gap (not joined into one control).

 */

export function ListToolbar({

  search,

  filters,

  actions,

  className,

}: ListToolbarProps) {

  if (!search && !filters && !actions) {

    return null;

  }



  return (

    <div className={cn(DATA_TABLE_TOOLBAR_CLASS, className)}>

      {actions ? (

        <div className="order-1 flex shrink-0 flex-wrap items-center gap-2">

          {actions}

        </div>

      ) : null}

      {search || filters ? (

        <div className="order-2 ml-auto flex min-w-0 shrink-0 flex-nowrap items-center justify-end gap-3 sm:gap-4">

          {search}

          {filters}

        </div>

      ) : null}

    </div>

  );

}


