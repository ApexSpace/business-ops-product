/**
 * Webhook status stored on BusinessIntegration.config.webhookStatus.
 * We do not verify Meta subscription state in-app yet.
 */
export function resolveMetaWebhookStatusLabel(
  webhookVerifyToken: string | null | undefined,
): string {
  if (webhookVerifyToken?.trim()) {
    return 'Webhook endpoint configured (subscription verification not implemented yet)';
  }
  return 'Webhook verify token not set (META_WEBHOOK_VERIFY_TOKEN)';
}
