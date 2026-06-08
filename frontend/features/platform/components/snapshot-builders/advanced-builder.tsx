"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Copy, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { parseAssetsJson } from "@/features/platform/schemas/snapshot-form";
import { useSnapshotEditor } from "@/features/platform/hooks/use-snapshot-editor";

export function AdvancedBuilder() {
  const { assets, replaceAssets, canManage } = useSnapshotEditor();
  const [jsonText, setJsonText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (assets) {
      setJsonText(JSON.stringify(assets, null, 2));
      setParseError(null);
    }
  }, [assets]);

  const applyJson = () => {
    try {
      const parsed = parseAssetsJson(jsonText);
      replaceAssets(parsed);
      setParseError(null);
      toast.success("Assets updated from JSON");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid JSON";
      setParseError(message);
      toast.error(message);
    }
  };

  const formatJson = () => {
    try {
      const parsed = parseAssetsJson(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setParseError(null);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  const copyJson = async () => {
    await navigator.clipboard.writeText(jsonText);
    toast.success("Copied to clipboard");
  };

  const exportJson = () => {
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "snapshot-assets.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importJson = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      setJsonText(text);
      try {
        const parsed = parseAssetsJson(text);
        replaceAssets(parsed);
        setParseError(null);
        toast.success("Imported assets from file");
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "Invalid JSON");
      }
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <div>
          <p className="font-medium">Advanced mode</p>
          <p className="text-sm text-amber-800/90">
            Editing raw JSON can break your snapshot. Prefer the structured builders
            unless you know what you&apos;re doing. Changes sync bidirectionally with
            the visual editors when you apply.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Assets JSON</CardTitle>
            <CardDescription>
              Full snapshot assets object. Apply to sync into structured editors.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={formatJson}>
              Format JSON
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={copyJson}>
              <Copy className="mr-2 size-4" />
              Copy
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={exportJson}>
              <Download className="mr-2 size-4" />
              Export JSON
            </Button>
            {canManage ? (
              <>
                <Button type="button" variant="outline" size="sm" onClick={importJson}>
                  <Upload className="mr-2 size-4" />
                  Import JSON
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={applyJson}>
                  Apply JSON to editor
                </Button>
              </>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setParseError(null);
            }}
            rows={24}
            disabled={!canManage}
            className="font-mono text-xs"
          />
          {parseError ? (
            <p className="text-sm text-destructive">{parseError}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
