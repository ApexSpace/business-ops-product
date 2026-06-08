export type SelectionRange = { start: number; end: number };

export function emailVariableLabel(key: string): string {
  const raw = key.includes(".") ? key.split(".").slice(1).join(" ") : key;
  return raw
    .split(/[._]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function captureSelection(
  element: HTMLInputElement | HTMLTextAreaElement,
): SelectionRange {
  return {
    start: element.selectionStart ?? element.value.length,
    end: element.selectionEnd ?? element.value.length,
  };
}

export function insertAtCursor(
  token: string,
  currentValue: string,
  setValue: (value: string) => void,
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  selectionRef: React.MutableRefObject<SelectionRange | null>,
) {
  const element = inputRef.current;
  let start: number;
  let end: number;

  if (
    element != null &&
    element === document.activeElement &&
    element.selectionStart != null
  ) {
    start = element.selectionStart;
    end = element.selectionEnd ?? start;
  } else if (selectionRef.current) {
    ({ start, end } = selectionRef.current);
  } else {
    start = currentValue.length;
    end = currentValue.length;
  }

  const nextValue =
    currentValue.slice(0, start) + token + currentValue.slice(end);
  setValue(nextValue);

  const cursor = start + token.length;
  requestAnimationFrame(() => {
    if (!element) return;
    element.focus();
    element.setSelectionRange(cursor, cursor);
    selectionRef.current = { start: cursor, end: cursor };
  });
}
