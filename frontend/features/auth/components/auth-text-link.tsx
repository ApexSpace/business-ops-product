import Link from "next/link";
import { cn } from "@/lib/utils";

export function AuthTextLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-[var(--radius-xs)] text-body-small text-violet-primary-normal underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-violet-primary-normal/40 focus-visible:outline-none",
        className,
      )}
    >
      {children}
    </Link>
  );
}
