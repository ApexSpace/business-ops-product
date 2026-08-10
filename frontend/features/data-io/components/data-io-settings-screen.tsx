"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataImportWizard } from "@/features/data-io/components/data-import-wizard";
import {
  downloadDataExport,
  listDataImports,
  listDataIoEntities,
  type DataIoEntityType,
} from "@/features/data-io/api/data-io.api";

export function DataIoSettingsScreen() {
  const [importEntity, setImportEntity] = useState<DataIoEntityType | null>(
    null,
  );
  const entitiesQuery = useQuery({
    queryKey: ["data-io", "entities"],
    queryFn: listDataIoEntities,
  });
  const jobsQuery = useQuery({
    queryKey: ["data-io", "imports"],
    queryFn: () => listDataImports({ page: 1, limit: 20 }),
  });

  const entities = entitiesQuery.data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Data import & export
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Migrate CSV/Excel files from other platforms, or export your data.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {entities.map((entity) => (
            <div
              key={entity.entityType}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{entity.entityType}</p>
                <p className="text-xs text-muted-foreground">
                  {entity.supportsImport ? "Import" : "No import"} ·{" "}
                  {entity.supportsExport ? "Export" : "No export"}
                </p>
              </div>
              <div className="flex gap-2">
                {entity.supportsImport ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setImportEntity(entity.entityType)}
                  >
                    <Upload className="mr-1.5 size-4" />
                    Import
                  </Button>
                ) : null}
                {entity.supportsExport ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await downloadDataExport(entity.entityType);
                        toast.success(`${entity.entityType} exported`);
                      } catch {
                        toast.error("Export failed");
                      }
                    }}
                  >
                    <Download className="mr-1.5 size-4" />
                    Export
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent imports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(jobsQuery.data?.items ?? []).length === 0 ? (
            <p className="text-muted-foreground">No imports yet.</p>
          ) : (
            (jobsQuery.data?.items ?? []).map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <span>
                  {job.entityType} · {job.status}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(job.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {importEntity ? (
        <DataImportWizard
          open={Boolean(importEntity)}
          onOpenChange={(open) => {
            if (!open) {
              setImportEntity(null);
              void jobsQuery.refetch();
            }
          }}
          entityType={importEntity}
          title={`Import ${importEntity}`}
        />
      ) : null}
    </div>
  );
}
