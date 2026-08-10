"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadFile } from "@/lib/storage";
import {
  attachDataImportFile,
  configureDataImport,
  createDataImport,
  downloadImportTemplate,
  getDataImport,
  startDataImport,
  type ColumnMapping,
  type DataIoEntityType,
} from "@/features/data-io/api/data-io.api";

const PROVIDERS = [
  { value: "other", label: "Other / generic CSV" },
  { value: "mangomint", label: "Mangomint" },
  { value: "fresha", label: "Fresha" },
  { value: "square", label: "Square" },
  { value: "vagaro", label: "Vagaro" },
  { value: "hubspot", label: "HubSpot" },
  { value: "salesforce", label: "Salesforce" },
] as const;

type Step = "upload" | "map" | "run" | "done";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: DataIoEntityType;
  title?: string;
};

export function DataImportWizard({
  open,
  onOpenChange,
  entityType,
  title,
}: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [provider, setProvider] = useState<string>("other");
  const [duplicatePolicy, setDuplicatePolicy] = useState<
    "SKIP" | "UPDATE" | "CREATE_ALWAYS"
  >("UPDATE");
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping[]>([]);
  const [fields, setFields] = useState<Array<{ key: string; label: string }>>(
    [],
  );
  const [sampleRows, setSampleRows] = useState<Record<string, string>[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetName, setSheetName] = useState<string | undefined>();
  const [stats, setStats] = useState<{
    created?: number;
    updated?: number;
    skipped?: number;
    failed?: number;
    total?: number;
  } | null>(null);

  const reset = () => {
    setStep("upload");
    setProvider("other");
    setDuplicatePolicy("UPDATE");
    setBusy(false);
    setJobId(null);
    setMapping([]);
    setFields([]);
    setSampleRows([]);
    setWarnings([]);
    setSheetNames([]);
    setSheetName(undefined);
    setStats(null);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const fieldOptions = useMemo(
    () => [
      { key: "__skip__", label: "Skip column" },
      { key: "__append_to_notes__", label: "Append to notes" },
      ...fields,
    ],
    [fields],
  );

  async function onFileSelected(file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const draft = await createDataImport({
        entityType,
        providerPreset: provider === "other" ? undefined : provider,
      });
      setJobId(draft.id);

      const asset = await uploadFile({
        file,
      });

      const attached = await attachDataImportFile(draft.id, {
        fileAssetId: asset.id,
        sheetName,
      });

      setMapping(attached.preview.inferredMapping);
      setFields(attached.preview.fields);
      setSampleRows(attached.preview.sampleRows.slice(0, 5));
      setWarnings(
        Array.isArray(attached.warnings)
          ? (attached.warnings as string[])
          : attached.preview.format
            ? []
            : [],
      );
      const warnList = [
        ...(Array.isArray(attached.warnings) ? (attached.warnings as string[]) : []),
        ...attached.preview.headers.length === 0
          ? ["No headers detected"]
          : [],
      ];
      // prefer server warnings from job
      if (Array.isArray(attached.warnings)) {
        setWarnings(attached.warnings as string[]);
      } else {
        setWarnings(warnList);
      }
      setSheetNames(attached.preview.sheetNames ?? []);
      setStep("map");
      toast.success("File uploaded — review column mapping");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload import file",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmMapping() {
    if (!jobId) return;
    setBusy(true);
    try {
      await configureDataImport(jobId, {
        mapping,
        duplicatePolicy,
        providerPreset: provider === "other" ? undefined : provider,
        autoCreateTags: true,
      });
      setStep("run");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save mapping",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onStartImport() {
    if (!jobId) return;
    setBusy(true);
    try {
      await startDataImport(jobId);
      // Poll until complete
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const job = await getDataImport(jobId);
        if (
          job.status === "COMPLETED" ||
          job.status === "COMPLETED_WITH_ERRORS" ||
          job.status === "FAILED"
        ) {
          setStats(job.stats);
          setStep("done");
          if (job.status === "FAILED") {
            toast.error("Import failed");
          } else {
            toast.success("Import finished");
          }
          break;
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start import",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title ?? `Import ${entityType}`}</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel export, map columns, then import.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Coming from</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => downloadImportTemplate(entityType)}
              >
                Download template
              </Button>
              <label className="inline-flex cursor-pointer">
                <input
                  type="file"
                  accept=".csv,.xlsx,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    e.target.value = "";
                    void onFileSelected(file);
                  }}
                />
                <Button
                  type="button"
                  disabled={busy}
                  nativeButton={false}
                  render={<span />}
                >
                  {busy ? "Uploading…" : "Choose CSV / Excel file"}
                </Button>
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              PDF and screenshot imports are not supported. Convert to CSV or
              Excel first.
            </p>
          </div>
        ) : null}

        {step === "map" ? (
          <div className="space-y-4">
            {warnings.length > 0 ? (
              <ul className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
            {sheetNames.length > 1 ? (
              <div className="space-y-2">
                <Label>Excel sheet</Label>
                <Select
                  value={sheetName ?? sheetNames[0]}
                  onValueChange={setSheetName}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sheetNames.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Duplicate policy</Label>
              <Select
                value={duplicatePolicy}
                onValueChange={(v) =>
                  setDuplicatePolicy(v as typeof duplicatePolicy)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPDATE">Update existing</SelectItem>
                  <SelectItem value="SKIP">Skip existing</SelectItem>
                  <SelectItem value="CREATE_ALWAYS">Create always</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3">
              {mapping.map((m, idx) => (
                <div
                  key={m.sourceColumn}
                  className="grid grid-cols-[1fr_1fr] items-center gap-2 text-sm"
                >
                  <span className="truncate font-medium">{m.sourceColumn}</span>
                  <Select
                    value={
                      m.action === "skip"
                        ? "__skip__"
                        : m.action === "append_to_notes"
                          ? "__append_to_notes__"
                          : (m.target ?? "__skip__")
                    }
                    onValueChange={(value) => {
                      setMapping((prev) => {
                        const next = [...prev];
                        if (value === "__skip__") {
                          next[idx] = {
                            sourceColumn: m.sourceColumn,
                            target: null,
                            action: "skip",
                          };
                        } else if (value === "__append_to_notes__") {
                          next[idx] = {
                            sourceColumn: m.sourceColumn,
                            target: null,
                            action: "append_to_notes",
                          };
                        } else {
                          next[idx] = {
                            sourceColumn: m.sourceColumn,
                            target: value,
                            action: "map",
                          };
                        }
                        return next;
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldOptions.map((f) => (
                        <SelectItem key={f.key} value={f.key}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            {sampleRows.length > 0 ? (
              <div className="overflow-x-auto rounded-md border text-xs">
                <table className="w-full">
                  <thead>
                    <tr>
                      {mapping.map((m) => (
                        <th key={m.sourceColumn} className="border-b px-2 py-1 text-left">
                          {m.sourceColumn}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sampleRows.map((row, i) => (
                      <tr key={i}>
                        {mapping.map((m) => (
                          <td key={m.sourceColumn} className="border-b px-2 py-1">
                            {row[m.sourceColumn] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button disabled={busy} onClick={onConfirmMapping}>
                Continue
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {step === "run" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ready to import. This runs in the background and will not block
              the app.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("map")}>
                Back
              </Button>
              <Button disabled={busy} onClick={onStartImport}>
                {busy ? "Importing…" : "Start import"}
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {step === "done" ? (
          <div className="space-y-4">
            <div className="rounded-md border p-4 text-sm">
              <p>Created: {stats?.created ?? 0}</p>
              <p>Updated: {stats?.updated ?? 0}</p>
              <p>Skipped: {stats?.skipped ?? 0}</p>
              <p>Failed: {stats?.failed ?? 0}</p>
              <p>Total: {stats?.total ?? 0}</p>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Close</Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
