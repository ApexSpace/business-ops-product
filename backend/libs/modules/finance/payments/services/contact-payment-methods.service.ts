import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { StripeContactPaymentMethodService } from './stripe-contact-payment-method.service';
import { ContactPaymentMethodRepository } from '../repositories/contact-payment-method.repository';
import { toContactPaymentMethodResponse } from '../mappers/contact-payment-method.mapper';

@Injectable()
export class ContactPaymentMethodsService {
  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly paymentMethodRepository: ContactPaymentMethodRepository,
    private readonly stripePaymentMethodService: StripeContactPaymentMethodService,
  ) {}

  async list(businessId: string, contactId: string) {
    await this.requireContact(businessId, contactId);
    const items = await this.paymentMethodRepository.findManyForContact(
      businessId,
      contactId,
    );
    return { items: items.map(toContactPaymentMethodResponse) };
  }

  async createSetupIntent(businessId: string, contactId: string) {
    await this.requireContact(businessId, contactId);
    return this.stripePaymentMethodService.createSetupIntent(
      businessId,
      contactId,
    );
  }

  async detach(businessId: string, contactId: string, methodId: string) {
    await this.requireContact(businessId, contactId);
    await this.stripePaymentMethodService.detach(
      businessId,
      contactId,
      methodId,
    );
    return { success: true };
  }

  async requirePaymentMethodForCharge(
    businessId: string,
    contactId: string,
    methodId: string,
  ) {
    const row = await this.paymentMethodRepository.findById(
      businessId,
      contactId,
      methodId,
    );
    if (!row) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Saved card not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private async requireContact(businessId: string, contactId: string) {
    const contact = await this.contactRepository.findById(
      businessId,
      contactId,
    );
    if (!contact) {
      throw new AppException(
        ErrorCode.CONTACT_NOT_FOUND,
        'Contact not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
