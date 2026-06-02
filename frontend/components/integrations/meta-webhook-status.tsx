interface MetaWebhookStatusProps {
  webhookStatus?: string | null;
}

/** Renders Meta webhook configuration status from integration config. */
export function MetaWebhookStatus({ webhookStatus }: MetaWebhookStatusProps) {
  if (!webhookStatus) return null;

  const isConfigured = webhookStatus.includes("endpoint configured");

  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">Webhook</span>
      <span
        className={
          isConfigured
            ? "max-w-[65%] text-right text-xs text-muted-foreground"
            : "max-w-[65%] text-right text-xs text-amber-700 dark:text-amber-400"
        }
      >
        {webhookStatus}
      </span>
    </div>
  );
}
