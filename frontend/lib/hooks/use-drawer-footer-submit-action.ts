import { useEffect, useRef } from "react";

export interface DrawerFooterSubmitAction {
  label: string;
  disabled: boolean;
  onClick: () => void;
}

/**
 * Publishes a drawer footer CTA without re-render loops from unstable callbacks.
 * Only notifies the parent when label/disabled change or when enabled toggles.
 */
export function useDrawerFooterSubmitAction(
  enabled: boolean,
  label: string,
  disabled: boolean,
  onClick: () => void,
  onActionChange?: (action: DrawerFooterSubmitAction | null) => void,
) {
  const onChangeRef = useRef(onActionChange);
  onChangeRef.current = onActionChange;

  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  const publishedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const notify = onChangeRef.current;
    if (!notify) return;

    if (!enabled) {
      if (publishedKeyRef.current !== null) {
        publishedKeyRef.current = null;
        notify(null);
      }
      return;
    }

    const key = `${label}\0${disabled}`;
    if (publishedKeyRef.current === key) return;
    publishedKeyRef.current = key;

    notify({
      label,
      disabled,
      onClick: () => {
        onClickRef.current();
      },
    });
  }, [enabled, label, disabled]);

  useEffect(() => {
    return () => {
      publishedKeyRef.current = null;
      onChangeRef.current?.(null);
    };
  }, []);
}
