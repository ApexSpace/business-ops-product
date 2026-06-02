import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

type Envelope<T> = { data?: T } | T;

function unwrap<T>(body: Envelope<T>): T {
  if (body !== null && typeof body === 'object' && 'data' in body && body.data) {
    return body.data;
  }
  return body as T;
}

interface ContactResponse {
  id: string;
  businessId: string;
  firstName: string | null;
  displayName: string | null;
  companyName: string | null;
  email: string | null;
  createdById: string | null;
  label: string;
  tags: { id: string; name: string }[];
}

async function registerOwner(
  app: INestApplication<App>,
  apiPrefix: string,
  suffix: string,
): Promise<{ token: string; email: string }> {
  const email = `owner-${suffix}@example.com`;
  const password = 'TestPass123!';

  const res = await request(app.getHttpServer())
    .post(`/${apiPrefix}/auth/register`)
    .send({
      email,
      password,
      businessName: `Contacts Co ${suffix}`,
      firstName: 'Owner',
      lastName: suffix,
    })
    .expect(201);

  const body = unwrap<{ accessToken: string }>(res.body);
  return { token: body.accessToken, email };
}

describe('Contacts (e2e)', () => {
  let app: INestApplication<App>;
  const apiPrefix = process.env.API_PREFIX ?? 'api/v1';

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??=
      'test-access-secret-min-16-chars';
    process.env.JWT_REFRESH_SECRET ??=
      'test-refresh-secret-min-16-chars';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(apiPrefix);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it(
    'CRUD, tags, search, duplicate email, confirm delete, tenancy',
    async () => {
      const suffix = randomUUID().slice(0, 8);
      const { token: ownerToken, email: ownerEmail } = await registerOwner(
        app,
        apiPrefix,
        suffix,
      );

      const meRes = await request(app.getHttpServer())
        .get(`/${apiPrefix}/auth/me`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      const me = unwrap<{ id: string }>(meRes.body);

      const createRes = await request(app.getHttpServer())
        .post(`/${apiPrefix}/contacts`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          firstName: 'Acme',
          lastName: 'HVAC',
          companyName: 'Acme HVAC LLC',
          email: `contact-${suffix}@example.com`,
          phoneCountryCode: '+1',
          phoneNumber: '5550001111',
          timezone: 'America/New_York',
          source: 'manual',
        })
        .expect(201);

      const contact = unwrap<ContactResponse>(createRes.body);
      expect(contact.id).toBeDefined();
      expect(contact.displayName).toBe('Acme HVAC');
      expect(contact.companyName).toBe('Acme HVAC LLC');
      expect(contact.label).toBe('Acme HVAC');
      expect(contact.firstName).toBe('Acme');
      expect(contact.createdById).toBe(me.id);

      const tagRes = await request(app.getHttpServer())
        .post(`/${apiPrefix}/contact-tags`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'vip' })
        .expect(201);
      const tag = unwrap<{ id: string; name: string }>(tagRes.body);
      expect(tag.name).toBe('vip');

      await request(app.getHttpServer())
        .patch(`/${apiPrefix}/contacts/${contact.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ tagIds: [tag.id] })
        .expect(200);

      const getRes = await request(app.getHttpServer())
        .get(`/${apiPrefix}/contacts/${contact.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      const fetched = unwrap<ContactResponse>(getRes.body);
      expect(fetched.tags).toHaveLength(1);
      expect(fetched.tags[0].name).toBe('vip');

      const listRes = await request(app.getHttpServer())
        .get(`/${apiPrefix}/contacts`)
        .query({ search: 'Acme HVAC' })
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      const list = unwrap<{
        items: ContactResponse[];
        meta: { total: number };
      }>(listRes.body);
      expect(list.items.some((c) => c.id === contact.id)).toBe(true);
      expect(list.meta.total).toBeGreaterThanOrEqual(1);

      const codeOnlyRes = await request(app.getHttpServer())
        .post(`/${apiPrefix}/contacts`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          firstName: 'Code',
          lastName: 'Only',
          phoneCountryCode: '+1',
          timezone: 'America/New_York',
        })
        .expect(201);
      const codeOnly = unwrap<ContactResponse & {
        phoneCountryCode: string | null;
        phoneNumber: string | null;
        phone: string | null;
      }>(codeOnlyRes.body);
      expect(codeOnly.phoneCountryCode).toBeNull();
      expect(codeOnly.phoneNumber).toBeNull();
      expect(codeOnly.phone).toBeNull();

      await request(app.getHttpServer())
        .post(`/${apiPrefix}/contacts`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          firstName: 'Duplicate',
          email: `contact-${suffix}@example.com`,
        })
        .expect(409);

      await request(app.getHttpServer())
        .delete(`/${apiPrefix}/contacts/${contact.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);

      await request(app.getHttpServer())
        .delete(`/${apiPrefix}/contacts/${contact.id}`)
        .query({ confirm: 'true' })
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/${apiPrefix}/contacts/${contact.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);

      const otherSuffix = randomUUID().slice(0, 8);
      const { token: otherToken } = await registerOwner(
        app,
        apiPrefix,
        otherSuffix,
      );

      await request(app.getHttpServer())
        .get(`/${apiPrefix}/contacts/${contact.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);

      expect(ownerEmail).toBeDefined();
    },
    60000,
  );
});
