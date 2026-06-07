export default function PublicEstimatePage() {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
      <h1 className="text-lg font-semibold text-foreground">Estimate not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This link may be invalid or expired.
      </p>
    </div>
  );
}
