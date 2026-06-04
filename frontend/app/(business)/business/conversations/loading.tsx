export default function ConversationsLoading() {
  return (
    <div className="flex h-[calc(100vh-10rem)] min-h-[520px] animate-pulse items-center justify-center rounded-xl border border-border/80 bg-muted/30">
      <p className="text-sm text-muted-foreground">Loading inbox…</p>
    </div>
  );
}
