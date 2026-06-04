export class MessageUpdatedEvent {
  constructor(
    readonly businessId: string,
    readonly conversationId: string,
    readonly messageId: string,
    readonly status: string,
  ) {}
}

export class MessageReceivedEvent {
  constructor(
    readonly businessId: string,
    readonly conversationId: string,
    readonly messageId: string,
  ) {}
}

export class ContactCreatedEvent {
  constructor(
    readonly businessId: string,
    readonly contactId: string,
  ) {}
}

export class IntegrationConnectedEvent {
  constructor(
    readonly businessId: string,
    readonly providerKey: string,
  ) {}
}

export class InvoicePaidEvent {
  constructor(
    readonly businessId: string,
    readonly invoiceId: string,
  ) {}
}
