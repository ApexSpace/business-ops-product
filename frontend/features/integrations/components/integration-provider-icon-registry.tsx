"use client";

import {
  Bot,
  Calendar,
  Cloud,
  Mail,
  MapPin,
  MessageSquare,
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const INTEGRATION_ICON_SIZE_CLASSES = {
  sm: "size-8 text-[10px]",
  md: "size-10 text-xs",
} as const;

/** Normalize provider keys and aliases to a canonical icon key. */
export function resolveIntegrationIconKey(
  providerKey: string,
): string {
  const key = providerKey.toLowerCase();

  if (key.startsWith("google-") || key === "google-oauth" || key === "gmail") {
    if (key.includes("calendar")) return "google-calendar";
    if (key.includes("business") || key.includes("profile")) {
      return "google-business-profile";
    }
    if (key.includes("lead")) return "google-lead-ads";
    if (key === "gmail") return "gmail";
    return "google";
  }

  if (key.startsWith("tiktok")) return "tiktok";
  if (key === "s3-r2" || key.includes("cloudflare")) return "cloudflare-r2";
  if (key === "s3" || key.includes("aws-s3")) return "s3";

  return key;
}

export function isLocalStaticLogoUrl(url: string): boolean {
  return url.startsWith("/") || url.startsWith("data:");
}

interface BadgeProps {
  className?: string;
  children: React.ReactNode;
  title?: string;
}

function IconBadge({ className, children, title }: BadgeProps) {
  return (
    <div
      title={title}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function ProviderBrandIcon({
  iconKey,
  sizeClass,
}: {
  iconKey: string;
  sizeClass: string;
}) {
  switch (iconKey) {
    case "google":
    case "google-oauth":
      return (
        <IconBadge className={cn(sizeClass, "bg-white dark:bg-zinc-900")}>
          <GoogleMark className="size-[70%]" />
        </IconBadge>
      );

    case "google-calendar":
      return (
        <IconBadge className={cn(sizeClass, "bg-white dark:bg-zinc-900")}>
          <div className="relative flex size-full items-center justify-center">
            <GoogleMark className="absolute size-[55%] opacity-90" />
            <Calendar
              className="relative size-[38%] text-blue-600 dark:text-blue-400"
              strokeWidth={2.5}
            />
          </div>
        </IconBadge>
      );

    case "google-business-profile":
      return (
        <IconBadge className={cn(sizeClass, "bg-white dark:bg-zinc-900")}>
          <div className="relative flex size-full items-center justify-center">
            <GoogleMark className="absolute size-[55%] opacity-90" />
            <MapPin
              className="relative size-[38%] text-red-500 dark:text-red-400"
              strokeWidth={2.5}
            />
          </div>
        </IconBadge>
      );

    case "google-lead-ads":
      return (
        <IconBadge className={cn(sizeClass, "bg-white dark:bg-zinc-900")}>
          <div className="relative flex size-full items-center justify-center">
            <GoogleMark className="absolute size-[55%] opacity-90" />
            <span className="relative text-[0.55em] font-bold leading-none text-blue-600 dark:text-blue-400">
              Ads
            </span>
          </div>
        </IconBadge>
      );

    case "gmail":
      return (
        <IconBadge className={cn(sizeClass, "bg-white dark:bg-zinc-900")}>
          <div className="flex size-full flex-col items-center justify-center gap-0.5 p-1">
            <GoogleMark className="size-[45%]" />
            <Mail className="size-[30%] text-red-500 dark:text-red-400" strokeWidth={2.5} />
          </div>
        </IconBadge>
      );

    case "facebook":
      return (
        <IconBadge className={cn(sizeClass, "bg-[#1877F2]")}>
          <span className="font-bold leading-none text-white">f</span>
        </IconBadge>
      );

    case "webchat":
      return (
        <IconBadge className={cn(sizeClass, "bg-emerald-600")}>
          <MessageSquare className="size-[55%] text-white" strokeWidth={2.5} />
        </IconBadge>
      );

    case "instagram":
      return (
        <IconBadge
          className={cn(
            sizeClass,
            "border-0 bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
          )}
        >
          <svg viewBox="0 0 24 24" className="size-[58%]" aria-hidden="true">
            <rect
              x="5"
              y="5"
              width="14"
              height="14"
              rx="4"
              fill="none"
              stroke="white"
              strokeWidth="2"
            />
            <circle cx="12" cy="12" r="3.5" fill="none" stroke="white" strokeWidth="2" />
            <circle cx="16.2" cy="7.8" r="1.2" fill="white" />
          </svg>
        </IconBadge>
      );

    case "linkedin":
      return (
        <IconBadge className={cn(sizeClass, "bg-[#0A66C2]")}>
          <span className="font-bold leading-none text-white">in</span>
        </IconBadge>
      );

    case "tiktok":
      return (
        <IconBadge className={cn(sizeClass, "bg-black dark:bg-zinc-950")}>
          <svg viewBox="0 0 24 24" className="size-[58%]" aria-hidden="true">
            <path
              fill="#EE1D52"
              d="M14.5 5.5c.8 1.2 2 2 3.5 2.1V11c-1.3-.04-2.5-.5-3.5-1.2v5.8c0 2.8-2.2 5-5 5s-5-2.2-5-5 2.2-5 5-5c.3 0 .6 0 .9.1v2.6c-.3-.1-.6-.1-.9-.1-1.3 0-2.4 1.1-2.4 2.4s1.1 2.4 2.4 2.4 2.4-1.1 2.4-2.4V2h2.6v3.5z"
            />
            <path
              fill="#69C9D0"
              d="M16 7.6c1 .6 2.2 1 3.5 1.1V11c-1.3-.04-2.5-.5-3.5-1.2V7.6z"
              opacity="0.85"
            />
          </svg>
        </IconBadge>
      );

    case "stripe":
      return (
        <IconBadge className={cn(sizeClass, "bg-[#635BFF]")}>
          <span className="font-bold leading-none text-white">S</span>
        </IconBadge>
      );

    case "quickbooks":
      return (
        <IconBadge className={cn(sizeClass, "bg-[#2CA01C]")}>
          <span className="font-bold leading-none tracking-tight text-white">qb</span>
        </IconBadge>
      );

    case "xero":
      return (
        <IconBadge className={cn(sizeClass, "bg-[#13B5EA]")}>
          <span className="font-bold leading-none text-white">xe</span>
        </IconBadge>
      );

    case "wave":
      return (
        <IconBadge className={cn(sizeClass, "bg-[#1C77C3]")}>
          <span className="font-bold leading-none text-white">W</span>
        </IconBadge>
      );

    case "meta-app":
      return (
        <IconBadge className={cn(sizeClass, "bg-[#0668E1]")}>
          <span className="text-[0.5em] font-bold leading-none text-white">
            Meta
          </span>
        </IconBadge>
      );

    case "whatsapp":
      return (
        <IconBadge className={cn(sizeClass, "bg-[#25D366]")}>
          <svg viewBox="0 0 24 24" className="size-[58%]" aria-hidden="true">
            <path
              fill="white"
              d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"
            />
            <path
              fill="white"
              d="M12 2C6.486 2 2 6.262 2 11.45c0 2.07.683 3.985 1.84 5.538L2 22l5.203-1.362A9.8 9.8 0 0 0 12 20.9C17.514 20.9 22 16.638 22 11.45 22 6.262 17.514 2 12 2z"
            />
          </svg>
        </IconBadge>
      );

    case "sms":
      return (
        <IconBadge className={cn(sizeClass, "bg-blue-600 dark:bg-blue-700")}>
          <MessageSquare className="size-[55%] text-white" strokeWidth={2.25} />
        </IconBadge>
      );

    case "email":
      return (
        <IconBadge className={cn(sizeClass, "bg-slate-600 dark:bg-slate-500")}>
          <Mail className="size-[55%] text-white" strokeWidth={2.25} />
        </IconBadge>
      );

    case "openai":
      return (
        <IconBadge className={cn(sizeClass, "bg-neutral-900 dark:bg-neutral-800")}>
          <Bot className="size-[55%] text-emerald-400" strokeWidth={2.25} />
        </IconBadge>
      );

    case "s3":
      return (
        <IconBadge className={cn(sizeClass, "bg-[#FF9900]")}>
          <Cloud className="size-[55%] text-white" strokeWidth={2.25} />
        </IconBadge>
      );

    case "cloudflare-r2":
      return (
        <IconBadge className={cn(sizeClass, "bg-[#F6821F]")}>
          <div className="flex size-full flex-col items-center justify-center">
            <Cloud className="size-[45%] text-white" strokeWidth={2.25} />
            <span className="text-[0.45em] font-bold leading-none text-white">R2</span>
          </div>
        </IconBadge>
      );

    default:
      return (
        <IconBadge className={cn(sizeClass, "bg-muted/60 dark:bg-muted/40")}>
          <Plug className="size-[55%] text-muted-foreground" strokeWidth={2.25} />
        </IconBadge>
      );
  }
}
