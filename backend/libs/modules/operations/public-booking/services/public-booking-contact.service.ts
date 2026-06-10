import { Injectable } from '@nestjs/common';
import { Contact } from '@prisma/client';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { normalizePhoneKey } from '@app/modules/crm/contacts/utils/contact-profile.util';

export interface PublicBookingContactInput {
  customerName: string;
  customerEmail?: string;
  phoneCountryCode?: string;
  phoneNumber?: string;
  formAnswers?: Record<string, unknown>;
  source: 'Public Booking' | 'Calendar Widget';
}

@Injectable()
export class PublicBookingContactService {
  constructor(private readonly contactRepository: ContactRepository) {}

  async resolveOrCreate(
    businessId: string,
    input: PublicBookingContactInput,
  ): Promise<Contact> {
    const email = input.customerEmail?.trim().toLowerCase() || null;
    const phoneKey = normalizePhoneKey(
      input.phoneCountryCode,
      input.phoneNumber,
    );

    let contact: Contact | null = null;

    if (email && phoneKey) {
      const byEmail = await this.contactRepository.findByEmail(
        businessId,
        email,
      );
      const byPhone = await this.contactRepository.findByPhoneKey(
        businessId,
        phoneKey,
      );
      if (byEmail && byPhone && byEmail.id === byPhone.id) {
        contact = byEmail;
      } else if (byEmail) {
        contact = byEmail;
      } else if (byPhone) {
        contact = byPhone;
      }
    } else if (email) {
      contact = await this.contactRepository.findByEmail(businessId, email);
    } else if (phoneKey) {
      contact = await this.contactRepository.findByPhoneKey(
        businessId,
        phoneKey,
      );
    }

    if (contact) {
      await this.contactRepository.touchUpdatedAt(businessId, contact.id);
      return contact;
    }

    const nameParts = input.customerName.trim().split(/\s+/);
    const firstName = nameParts[0] ?? input.customerName.trim();
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

    return this.contactRepository.createPublic(businessId, {
      firstName,
      lastName,
      displayName: input.customerName.trim(),
      email,
      phoneCountryCode: input.phoneCountryCode?.trim() || null,
      phoneNumber: input.phoneNumber?.trim() || null,
      source: input.source,
      metadata: input.formAnswers
        ? ({ publicBookingFormAnswers: input.formAnswers } as object)
        : undefined,
    });
  }
}
