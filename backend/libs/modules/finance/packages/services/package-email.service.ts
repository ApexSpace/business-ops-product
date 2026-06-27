import { Injectable, Logger } from '@nestjs/common';
import { EmailNotificationService } from '@app/modules/communications/email/services/email-notification.service';
import type { ClientPackageDetailResponseDto } from '../dto/package.dto';

type BusinessEmailContext = {
  id: string;
  name: string;
  displayName?: string | null;
};

@Injectable()
export class PackageEmailService {
  private readonly logger = new Logger(PackageEmailService.name);

  constructor(private readonly emailNotification: EmailNotificationService) {}

  async sendPurchaseConfirmation(params: {
    business: BusinessEmailContext;
    clientPackage: ClientPackageDetailResponseDto;
    purchaserEmail: string;
    purchaserName: string;
    amountPaid: string;
  }): Promise<void> {
    const email = params.purchaserEmail.trim();
    if (!email) {
      this.logger.warn(
        `Client package ${params.clientPackage.id} has no purchaser email`,
      );
      return;
    }

    const businessName = this.resolveBusinessName(params.business);
    const purchaserName =
      params.purchaserName.trim() || params.clientPackage.contact.name;
    const packageName = this.formatPackageName(params.clientPackage);
    const includes = this.formatIncludes(params.clientPackage);
    const expiration = this.formatExpiration(params.clientPackage.expirationDate);

    await this.emailNotification.enqueueTransactionalEmail({
      businessId: params.business.id,
      emailType: 'package.purchase_confirmation',
      toEmail: email,
      fromName: businessName,
      contactId: params.clientPackage.contact.id,
      variables: {
        'business.name': businessName,
        'contact.name': purchaserName,
        'package.name': packageName,
        'package.amount_paid': `$${params.amountPaid}`,
        'package.total_qty': String(params.clientPackage.totalQty),
        'package.includes': includes,
        'package.expiration_date': expiration,
      },
      entityType: 'ClientPackage',
      entityId: params.clientPackage.id,
      idempotencyKey: `package-purchase-confirm-${params.clientPackage.id}-${email}`,
      templateOverride: {
        subject: `Your package purchase from ${businessName}`,
        htmlBody: `
          <h1>Purchase confirmed</h1>
          <p>Hi ${purchaserName},</p>
          <p>Thank you for your package purchase from ${businessName}.</p>
          <p><strong>Package:</strong> ${packageName}</p>
          <p><strong>Amount paid:</strong> $${params.amountPaid}</p>
          <p><strong>Includes:</strong> ${includes}</p>
          ${expiration !== 'No expiration' ? `<p><strong>Expires:</strong> ${expiration}</p>` : ''}
          <p>Your package is now active on your account.</p>
        `,
        textBody: `Your package purchase from ${businessName} is confirmed. Package: ${packageName}. Amount paid: $${params.amountPaid}. Includes: ${includes}. Expiration: ${expiration}.`,
      },
    });
  }

  async sendInternalNotification(params: {
    business: BusinessEmailContext;
    clientPackage: ClientPackageDetailResponseDto;
    notifyEmail: string;
    purchaserName: string;
    amountPaid: string;
  }): Promise<void> {
    const email = params.notifyEmail.trim();
    if (!email) return;

    const businessName = this.resolveBusinessName(params.business);
    const packageName = this.formatPackageName(params.clientPackage);
    const purchaserName =
      params.purchaserName.trim() || params.clientPackage.contact.name;

    await this.emailNotification.enqueueTransactionalEmail({
      businessId: params.business.id,
      emailType: 'package.internal_notification',
      toEmail: email,
      fromName: businessName,
      variables: {
        'business.name': businessName,
        'package.name': packageName,
        'package.amount_paid': `$${params.amountPaid}`,
        'package.purchaser_name': purchaserName,
        'package.client_name': params.clientPackage.contact.name,
      },
      entityType: 'ClientPackage',
      entityId: params.clientPackage.id,
      idempotencyKey: `package-internal-${params.clientPackage.id}-${email}`,
      templateOverride: {
        subject: `New online package sold — ${businessName}`,
        htmlBody: `
          <p>A new online package was sold for ${businessName}.</p>
          <p><strong>Package:</strong> ${packageName}</p>
          <p><strong>Amount paid:</strong> $${params.amountPaid}</p>
          <p><strong>Client:</strong> ${params.clientPackage.contact.name}</p>
          <p><strong>Purchaser:</strong> ${purchaserName}</p>
        `,
        textBody: `New package sold for ${businessName}: ${packageName}, $${params.amountPaid}, client ${params.clientPackage.contact.name}, purchaser ${purchaserName}.`,
      },
    });
  }

  private resolveBusinessName(business: BusinessEmailContext): string {
    return business.displayName?.trim() || business.name;
  }

  private formatPackageName(clientPackage: ClientPackageDetailResponseDto): string {
    const emoji = clientPackage.packageTemplate.emoji?.trim();
    const name = clientPackage.packageTemplate.name;
    return emoji ? `${emoji} ${name}` : name;
  }

  private formatIncludes(clientPackage: ClientPackageDetailResponseDto): string {
    if (clientPackage.serviceAllocations.length === 0) {
      return `${clientPackage.totalQty} services`;
    }
    return clientPackage.serviceAllocations
      .map((allocation) => `${allocation.initialQty} ${allocation.serviceName}`)
      .join(', ');
  }

  private formatExpiration(expirationDate: Date | null): string {
    if (!expirationDate) return 'No expiration';
    return expirationDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
