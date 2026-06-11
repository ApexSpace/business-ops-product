const { PrismaClient } = require('@prisma/client');
const { extractInboundEmailBody } = require('./dist/apps/api/libs/modules/communications/email/utils/email-reply-body.util.js');

const prisma = new PrismaClient();

async function main() {
  const msgs = await prisma.conversationMessage.findMany({
    where: { conversationId: 'cb5493b6-c065-4319-be7e-eaa8d873d35c' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      text: true,
      direction: true,
      channel: true,
      providerKey: true,
    },
  });

  console.log('count:', msgs.length);
  for (const m of msgs) {
    console.log('---');
    console.log(
      JSON.stringify({
        direction: m.direction,
        channel: m.channel,
        providerKey: m.providerKey,
      }),
    );
    console.log('raw:', JSON.stringify(m.text));
    console.log('stripped:', JSON.stringify(extractInboundEmailBody(m.text)));
    if (m.text) {
      const idx = m.text.indexOf('On');
      if (idx >= 0) {
        const slice = m.text.slice(Math.max(0, idx - 5), idx + 40);
        console.log(
          'around On:',
          JSON.stringify(slice),
          [...slice].map((c) => c.charCodeAt(0).toString(16)).join(' '),
        );
      }
    }
  }
}

main()
  .catch((e) => {
    console.error('ERR', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
