import {
  PUBLIC_ESTIMATE_UNAVAILABLE_BODY,
  PUBLIC_ESTIMATE_UNAVAILABLE_TITLE,
} from "@/features/estimates/public-estimate-launch";

/** C-P0-01 waived: leftover public links must not look like a working product. */
export function PublicEstimateUnavailablePage() {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
      <h1 className="text-lg font-semibold text-foreground">
        {PUBLIC_ESTIMATE_UNAVAILABLE_TITLE}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {PUBLIC_ESTIMATE_UNAVAILABLE_BODY}
      </p>
    </div>
  );
}
