import * as React from "react";

/** True after the component has mounted (safe for pathname / viewport-dependent UI). */
export function useHydrated() {
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
