"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { displayInitials } from "@/lib/ui/display-initials";
import { cn } from "@/lib/utils";

export interface ProfileAvatarProps {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
  size?: "default" | "sm" | "lg";
  alt?: string;
}

export function ProfileAvatar({
  name,
  avatarUrl,
  className,
  fallbackClassName,
  size = "default",
  alt = "",
}: ProfileAvatarProps) {
  const hasPhoto = Boolean(avatarUrl?.trim());

  return (
    <Avatar
      size={size}
      className={cn(
        "shrink-0",
        hasPhoto && "!bg-transparent after:hidden",
        className,
      )}
    >
      {hasPhoto ? (
        <AvatarImage src={avatarUrl!} alt={alt || name} className="object-cover" />
      ) : null}
      <AvatarFallback className={cn(!hasPhoto && fallbackClassName)}>
        {displayInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
