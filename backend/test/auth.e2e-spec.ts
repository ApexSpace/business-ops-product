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

describe('Auth & tenancy (e2e)', () => {
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

  it('POST /auth/login returns tokens for seeded super admin', async () => {
    const email =
      process.env.SEED_SUPER_ADMIN_EMAIL ?? 'admin@example.com';
    const password =
      process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!';

    const res = await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/login`)
      .send({ email, password })
      .expect(201);

    const payload = unwrap<{ accessToken: string; contexts: unknown[] }>(
      res.body,
    );
    expect(payload.accessToken).toBeDefined();
    expect(Array.isArray(payload.contexts)).toBe(true);
  });

  it(
    'register, switch context, platform business, invite member',
    async () => {
    const suffix = randomUUID().slice(0, 8);
    const email = `owner-${suffix}@example.com`;
    const password = 'TestPass123!';

    const registerRes = await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/register`)
      .send({
        email,
        password,
        businessName: `Test Co ${suffix}`,
        firstName: 'Test',
        lastName: 'Owner',
      })
      .expect(201);

    const registerBody = unwrap<{ accessToken: string }>(registerRes.body);
    const ownerToken = registerBody.accessToken;
    expect(ownerToken).toBeDefined();

    const adminEmail =
      process.env.SEED_SUPER_ADMIN_EMAIL ?? 'admin@example.com';
    const adminPassword =
      process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!';

    const loginRes = await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/login`)
      .send({ email: adminEmail, password: adminPassword })
      .expect(201);

    const loginBody = unwrap<{ accessToken: string }>(loginRes.body);
    let platformToken = loginBody.accessToken;

    const switchRes = await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/switch-context`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ type: 'platform' })
      .expect(201);

    const switchBody = unwrap<{ accessToken: string }>(switchRes.body);
    platformToken = switchBody.accessToken;

    const createBizRes = await request(app.getHttpServer())
      .post(`/${apiPrefix}/platform/businesses`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ name: `Platform Biz ${suffix}` })
      .expect(201);

    const biz = unwrap<{ id: string }>(createBizRes.body);
    expect(biz.id).toBeDefined();

    const inviteRes = await request(app.getHttpServer())
      .post(`/${apiPrefix}/businesses/current/members/invite`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: `member-${suffix}@example.com`,
        role: 'MEMBER',
      })
      .expect(201);

    const invite = unwrap<{ inviteLink: string }>(inviteRes.body);
    expect(invite.inviteLink).toContain('accept-invite?token=');
    },
    30000,
  );
});
