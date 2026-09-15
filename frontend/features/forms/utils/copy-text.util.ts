import { toast } from "sonner";

export async function copyTextToClipboard(
  text: string | null | undefined,
  label: string,
): Promise<boolean> {
  if (!text?.trim()) {
    toast.error(`${label} is not available`);
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
    return true;
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}`);
    return false;
  }
}
