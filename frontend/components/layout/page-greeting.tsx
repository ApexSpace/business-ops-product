"use client";

import { getUserDisplayName } from "@/lib/auth";
import { useAuth } from "@/lib/auth/provider";
import { cn } from "@/lib/utils";

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

interface PageGreetingProps {
  eyebrow?: string;
  name?: string;
  className?: string;
}

export function PageGreeting({
  eyebrow = "Dashboard",
  name: nameProp,
  className,
}: PageGreetingProps) {
  const { user } = useAuth();
  const name = nameProp ?? (user ? getUserDisplayName(user) : "there");

  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-page-eyebrow">{eyebrow}</p>
      <h1 className="text-page-greeting">
        {getTimeOfDayGreeting()}, {name}
      </h1>
    </div>
  );
}
