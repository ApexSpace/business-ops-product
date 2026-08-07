"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  fetchTrialEmbedSnippet,
  getTrialEmbedCodeFallback,
} from "@/features/trial-signup/api/trial-signup.api";

export function TrialEmbedCodeCard() {
  const [copied, setCopied] = useState(false);
  const query = useQuery({
    queryKey: ["trial-embed-snippet"],
    queryFn: async () => {
      try {
        return await fetchTrialEmbedSnippet();
      } catch {
        const fallback = getTrialEmbedCodeFallback();
        if (!fallback) throw new Error("Embed URL not configured");
        return { scriptEmbed: fallback, iframeSrc: "/widget/trial" };
      }
    },
    retry: false,
  });

  const code = query.data?.scriptEmbed ?? "";

  const onCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Embed code copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trial signup embed</CardTitle>
        <CardDescription>
          Paste this on any marketing site. The wizard creates a 14-day trial
          account and redirects into the app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading embed code…</p>
        ) : query.isError ? (
          <p className="text-sm text-destructive">
            Could not load embed snippet. Check BACKEND_URL / API connectivity.
          </p>
        ) : (
          <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap">
            {code}
          </pre>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void onCopy()}
          disabled={!code}
        >
          <Copy className="mr-2 size-4" />
          {copied ? "Copied" : "Copy embed code"}
        </Button>
      </CardContent>
    </Card>
  );
}
