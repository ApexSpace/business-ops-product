import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { resolve } from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { resolveDatabaseUrl } from '../libs/core/config/database-url.util';
import { resolveWhatsAppParticipantId } from '../libs/modules/communications/conversations/utils/contact-outbound-identity.util';

expand(config({ path: resolve(__dirname, '../.env') }));
process.env.DATABASE_URL = resolveDatabaseUrl(process.env);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const contactId = '2806387a-7ee6-4e12-aaa8-5bc6baa93b6e';
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  const conv = await prisma.conversation.findFirst({
    where: { contactId, channel: 'WHATSAPP' },
  });
  const msgs = await prisma.conversationMessage.findMany({
    where: { conversationId: conv?.id },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      status: true,
      externalMessageId: true,
      createdAt: true,
      text: true,
      externalRecipientId: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        contact: {
          phoneCountryCode: contact?.phoneCountryCode,
          phoneNumber: contact?.phoneNumber,
          metadata: contact?.metadata,
          resolved: contact ? resolveWhatsAppParticipantId(contact) : null,
        },
        conversation: {
          id: conv?.id,
          externalParticipantId: conv?.externalParticipantId,
        },
        messages: msgs,
      },
      null,
      2,
    ),
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
