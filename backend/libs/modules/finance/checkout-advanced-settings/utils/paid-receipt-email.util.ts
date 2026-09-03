import { formatMoney } from '@app/modules/communications/email/utils/email-variables.util';

type ReceiptLineItem = {
  title: string;
  staff?: { label: string } | null;
};

type ReceiptSettings = {
  showServiceProviderOnReceipt: boolean;
  receiptCustomFooterText?: string | null;
};

export function buildPaidReceiptEmailExtras(
  settings: ReceiptSettings,
  items: ReceiptLineItem[],
  metadata?: Record<string, unknown> | null,
): Record<string, string> {
  const extras: Record<string, string> = {
    'receipt.providersBlock': '',
    'receipt.footerBlock': '',
    'payment.tip': '',
  };

  if (settings.showServiceProviderOnReceipt) {
    const providerLines = items
      .filter((item) => item.staff?.label)
      .map((item) => `${item.title}: ${item.staff!.label}`);
    if (providerLines.length > 0) {
      extras['receipt.providersBlock'] =
        `<p><strong>Service providers</strong></p><p>${providerLines.join('<br/>')}</p>`;
    }
  }

  const footer = settings.receiptCustomFooterText?.trim();
  if (footer) {
    extras['receipt.footerBlock'] = `<p>${footer}</p>`;
  }

  const tipRaw = metadata?.tipAmount;
  const tip =
    typeof tipRaw === 'number'
      ? tipRaw
      : typeof tipRaw === 'string'
        ? parseFloat(tipRaw)
        : 0;
  if (Number.isFinite(tip) && tip > 0) {
    extras['payment.tip'] = formatMoney(tip);
  }

  return extras;
}
