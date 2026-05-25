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

interface PipelineResponse {
  id: string;
  isDefault: boolean;
  stages: { id: string; name: string; position: number; type?: string }[];
}

interface LeadResponse {
  id: string;
  contactId: string;
  pipelineStageId: string;
  status: string;
  assignedToId?: string | null;
}

async function registerOwner(
  app: INestApplication<App>,
  apiPrefix: string,
  suffix: string,
): Promise<{ token: string; userId: string }> {
  const email = `leads-owner-${suffix}@example.com`;
  const res = await request(app.getHttpServer())
    .post(`/${apiPrefix}/auth/register`)
    .send({
      email,
      password: 'TestPass123!',
      businessName: `Leads Co ${suffix}`,
    })
    .expect(201);

  const token = unwrap<{ accessToken: string }>(res.body).accessToken;

  const meRes = await request(app.getHttpServer())
    .get(`/${apiPrefix}/auth/me`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  const me = unwrap<{ id: string }>(meRes.body);
  return { token, userId: me.id };
}

describe('Leads (e2e)', () => {
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
    'creates lead from contact, moves stage, assigns owner, lists by stage',
    async () => {
      const suffix = randomUUID().slice(0, 8);
      const { token, userId } = await registerOwner(app, apiPrefix, suffix);

      const pipelinesRes = await request(app.getHttpServer())
        .get(`/${apiPrefix}/pipelines`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const pipelines = unwrap<PipelineResponse[]>(pipelinesRes.body);
      const defaultPipeline = pipelines.find((p) => p.isDefault)!;
      const firstStage = defaultPipeline.stages.find((s) => s.position === 1)!;
      const secondStage = defaultPipeline.stages.find((s) => s.position === 2)!;

      const contactRes = await request(app.getHttpServer())
        .post(`/${apiPrefix}/contacts`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          displayName: 'Jane Prospect',
          email: `jane-${suffix}@example.com`,
        })
        .expect(201);

      const contact = unwrap<{ id: string }>(contactRes.body);

      const leadRes = await request(app.getHttpServer())
        .post(`/${apiPrefix}/leads/from-contact/${contact.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ value: 1500 })
        .expect(201);

      const lead = unwrap<LeadResponse>(leadRes.body);
      expect(lead.contactId).toBe(contact.id);
      expect(lead.pipelineStageId).toBe(firstStage.id);
      expect(lead.status).toBe('ACTIVE');

      await request(app.getHttpServer())
        .post(`/${apiPrefix}/leads/from-contact/${contact.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(409);

      const moveRes = await request(app.getHttpServer())
        .patch(`/${apiPrefix}/leads/${lead.id}/stage`)
        .set('Authorization', `Bearer ${token}`)
        .send({ pipelineStageId: secondStage.id })
        .expect(200);

      const moved = unwrap<LeadResponse>(moveRes.body);
      expect(moved.pipelineStageId).toBe(secondStage.id);

      const assignRes = await request(app.getHttpServer())
        .patch(`/${apiPrefix}/leads/${lead.id}/assign`)
        .set('Authorization', `Bearer ${token}`)
        .send({ assignedToId: userId })
        .expect(200);

      const assigned = unwrap<LeadResponse>(assignRes.body);
      expect(assigned.assignedToId).toBe(userId);

      const listRes = await request(app.getHttpServer())
        .get(
          `/${apiPrefix}/leads?pipelineStageId=${secondStage.id}&limit=10`,
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const list = unwrap<{ items: LeadResponse[] }>(listRes.body);
      expect(list.items.some((l) => l.id === lead.id)).toBe(true);
    },
  );
});
