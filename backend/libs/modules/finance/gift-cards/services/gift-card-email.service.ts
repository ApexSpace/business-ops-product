import { Injectable, Logger } from '@nestjs/common';
import { GiftCard, GiftCardPromotion, GiftCardSettings } from '@prisma/client';
import { formatPhone } from '@app/modules/crm/contacts/utils/contact-profile.util';
import { formatContactName } from '@app/modules/communications/email/utils/email-variables.util';
import { NotificationDispatchService } from '@app/modules/communications/notifications/services/notification-dispatch.service';

type GiftCardWithContacts = GiftCard & {
  ownerContact: {
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    email: string | null;
    phoneNumber?: string | null;
    phoneCountryCode?: string | null;
  };
  promotion?: GiftCardPromotion | null;
};

type BusinessEmailContext = {
  id: string;
  name: string;
  displayName?: string | null;
};

@Injectable()
export class GiftCardEmailService {
  private readonly logger = new Logger(GiftCardEmailService.name);

  constructor(
    private readonly notificationDispatch: NotificationDispatchService,
  ) {}

  async sendGiftCardEmail(
    giftCard: GiftCardWithContacts,
    business: BusinessEmailContext,
    settings: GiftCardSettings | null,
    options?: { allowResend?: boolean },
  ): Promise<void> {
    const email = giftCard.ownerContact.email?.trim();
    const phone = formatPhone(
      giftCard.ownerContact.phoneCountryCode,
      giftCard.ownerContact.phoneNumber,
    );
    if (!email && !phone) {
      this.logger.warn(`Gift card ${giftCard.id} has no owner email or phone`);
      return;
    }

    const businessName = this.resolveBusinessName(business);
    const ownerName = formatContactName(giftCard.ownerContact);
    const promotionBlock = giftCard.promotion?.name
      ? `<p><strong>Promotion:</strong> ${giftCard.promotion.name}</p>`
      : '';
    const disclaimerBlock = settings?.purchaseDisclaimer?.trim()
      ? `<p><em>${settings.purchaseDisclaimer.trim()}</em></p>`
      : '';

    await this.notificationDispatch.dispatch({
      businessId: business.id,
      notificationKey: 'gift_card.delivery',
      toEmail: email,
      toPhone: phone,
      fromName: businessName,
      missingRecipient: 'skip',
      variables: {
        'business.name': businessName,
        'contact.name': ownerName,
        'gift_card.number': giftCard.number,
        'gift_card.balance': `$${giftCard.currentBalance.toFixed(2)}`,
        'gift_card.promotion_name': giftCard.promotion?.name ?? '',
        'gift_card.promotion_description':
          giftCard.promotion?.description ?? '',
        'gift_card.disclaimer': settings?.purchaseDisclaimer?.trim() ?? '',
      },
      entityType: 'GiftCard',
      entityId: giftCard.id,
      idempotencyKey: options?.allowResend
        ? `gift-card-delivery-${giftCard.id}-${email ?? phone}-${Date.now()}`
        : `gift-card-delivery-${giftCard.id}-${email ?? phone}`,
      templateOverride: {
        subject: `You received a gift card from ${businessName}`,
        htmlBody: `
          <h1>You received a gift card!</h1>
          <p>Hi ${ownerName},</p>
          <p>${businessName} sent you a gift card.</p>
          <p><strong>Card number:</strong> ${giftCard.number}</p>
          <p><strong>Balance:</strong> $${giftCard.currentBalance.toFixed(2)}</p>
          ${promotionBlock}
          ${disclaimerBlock}
        `,
        textBody: `You received a gift card from ${businessName}. Number: ${giftCard.number}. Balance: $${giftCard.currentBalance.toFixed(2)}.`,
      },
    });
  }

  async sendPurchaseConfirmation(
    giftCard: GiftCard,
    business: BusinessEmailContext,
    purchaserEmail: string,
    purchaserName: string,
    amountPaid: string,
    recipientEmail: string,
    purchaserPhone?: string | null,
  ): Promise<void> {
    const email = purchaserEmail.trim();
    const phone = purchaserPhone?.trim() || null;
    if (!email && !phone) return;

    const businessName = this.resolveBusinessName(business);

    await this.notificationDispatch.dispatch({
      businessId: business.id,
      notificationKey: 'gift_card.purchase_confirmation',
      toEmail: email || null,
      toPhone: phone,
      fromName: businessName,
      missingRecipient: 'skip',
      variables: {
        'business.name': businessName,
        'contact.name': purchaserName,
        'gift_card.number': giftCard.number,
        'gift_card.balance': `$${giftCard.initialValue.toFixed(2)}`,
        'gift_card.amount_paid': `$${amountPaid}`,
        'gift_card.recipient_email': recipientEmail,
      },
      entityType: 'GiftCard',
      entityId: giftCard.id,
      idempotencyKey: `gift-card-purchase-confirm-${giftCard.id}-${email || phone}`,
      templateOverride: {
        subject: `Your gift card purchase from ${businessName}`,
        htmlBody: `
          <h1>Purchase confirmed</h1>
          <p>Hi ${purchaserName},</p>
          <p>Thank you for your gift card purchase from ${businessName}.</p>
          <p><strong>Amount paid:</strong> $${amountPaid}</p>
          <p><strong>Gift card value:</strong> $${giftCard.initialValue.toFixed(2)}</p>
          <p><strong>Card number:</strong> ${giftCard.number}</p>
          <p>The gift card will be sent to ${recipientEmail}.</p>
        `,
        textBody: `Your gift card purchase from ${businessName} is confirmed. Paid $${amountPaid}, value $${giftCard.initialValue.toFixed(2)}, number ${giftCard.number}. Recipient: ${recipientEmail}.`,
      },
    });
  }

  async sendInternalNotification(
    giftCard: GiftCard,
    business: BusinessEmailContext,
    notifyEmail: string,
    purchaserName: string,
    recipientName: string,
  ): Promise<void> {
    const email = notifyEmail.trim();
    if (!email) return;

    const businessName = this.resolveBusinessName(business);

    // Internal notify address is email-only; SMS channel will skip without a phone.
    await this.notificationDispatch.dispatch({
      businessId: business.id,
      notificationKey: 'gift_card.internal_notification',
      toEmail: email,
      toPhone: null,
      fromName: businessName,
      missingRecipient: 'skip',
      variables: {
        'business.name': businessName,
        'gift_card.number': giftCard.number,
        'gift_card.balance': `$${giftCard.initialValue.toFixed(2)}`,
        'gift_card.purchaser_name': purchaserName,
        'gift_card.recipient_name': recipientName,
      },
      entityType: 'GiftCard',
      entityId: giftCard.id,
      idempotencyKey: `gift-card-internal-${giftCard.id}-${email}`,
      templateOverride: {
        subject: `New online gift card sold — ${businessName}`,
        htmlBody: `
          <p>A new online gift card was sold for ${businessName}.</p>
          <p><strong>Number:</strong> ${giftCard.number}</p>
          <p><strong>Value:</strong> $${giftCard.initialValue.toFixed(2)}</p>
          <p><strong>Purchaser:</strong> ${purchaserName}</p>
          <p><strong>Recipient:</strong> ${recipientName}</p>
        `,
        textBody: `New gift card sold for ${businessName}: ${giftCard.number}, $${giftCard.initialValue.toFixed(2)}, purchaser ${purchaserName}, recipient ${recipientName}.`,
      },
    });
  }

  private resolveBusinessName(business: BusinessEmailContext): string {
    return business.displayName?.trim() || business.name;
  }
}
