import { AUTH_LOGO_BANNER_CLASS } from "@/lib/design/auth-tokens";
import { cn } from "@/lib/utils";

export const AUTH_LOGO_SRC = "/branding/PandaCue.png";
export const AUTH_LOGO_ALT = "PandaCue";

export function AuthLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static public brand asset
    <img
      src={AUTH_LOGO_SRC}
      alt={AUTH_LOGO_ALT}
      width={2400}
      height={2134}
      decoding="async"
      fetchPriority="high"
      className={cn(AUTH_LOGO_BANNER_CLASS, className)}
    />
  );
}
