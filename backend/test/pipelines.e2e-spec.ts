import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../src/core/database/prisma.service';

type Envelope<T> = { data?: T } | T;

function unwrap<T>(body: Envelope<T>): T {
  if (body !== null && typeof body === 'object' && 'data' in body && body.data) {
    return body.data;
  }
  return body as T;
}

interface PipelineResponse {
  id: string;
  name: string;
  isDefault: boolean;
  stages: { id: string; name: string; position: number }[];
}

async function industryIdBySlug(
  prisma: PrismaService,
  slug: string,
): Promise<string> {
  const industry = await prisma.industry.findFirst({
    where: { slug, status: 'ACTIVE' },
    select: { id: true },
  });
  if (!industry) {
    throw new Error(`Active industry not found for slug: ${slug}`);
  }
  return industry.id;
}

async function registerWithIndustry(
  app: INestApplication<App>,
  apiPrefix: string,
  industryId: string,
  suffix: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post(`/${apiPrefix}/auth/register`)
    .send({
      email: `pipe-${suffix}@example.com`,
      password: 'TestPass123!',
      businessName: `Pipeline Co ${suffix}`,
      industryId,
    })
    .expect(201);

  return unwrap<{ accessToken: string }>(res.body).accessToken;
}

describe('Pipelines (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
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
    prisma = app.get(PrismaService);
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

  it('seeds med-spa default pipeline with industry-specific stages', async () => {
    const suffix = randomUUID().slice(0, 8);
    const industryId = await industryIdBySlug(prisma, 'med-spa');
    const token = await registerWithIndustry(
      app,
      apiPrefix,
      industryId,
      suffix,
    );

    const res = await request(app.getHttpServer())
      .get(`/${apiPrefix}/pipelines`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const pipelines = unwrap<PipelineResponse[]>(res.body);
    expect(pipelines.length).toBeGreaterThanOrEqual(1);
    const defaultPipeline = pipelines.find((p) => p.isDefault);
    expect(defaultPipeline?.name).toBe('Consultation Pipeline');
    expect(defaultPipeline?.stages.map((s) => s.name)).toContain(
      'Consultation Booked',
    );
    expect(defaultPipeline?.stages[0]?.position).toBe(1);
  });

  it('seeds HVAC with different stage names than med-spa', async () => {
    const suffix = randomUUID().slice(0, 8);
    const industryId = await industryIdBySlug(prisma, 'hvac');
    const token = await registerWithIndustry(
      app,
      apiPrefix,
      industryId,
      suffix,
    );

    const res = await request(app.getHttpServer())
      .get(`/${apiPrefix}/pipelines`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const pipelines = unwrap<PipelineResponse[]>(res.body);
    const defaultPipeline = pipelines.find((p) => p.isDefault);
    expect(defaultPipeline?.name).toBe('Service Job Pipeline');
    expect(defaultPipeline?.stages.map((s) => s.name)).toContain(
      'Estimate Sent',
    );
  });

  it('reorders stages and blocks delete when leads exist', async () => {
    const suffix = randomUUID().slice(0, 8);
    const industryId = await industryIdBySlug(prisma, 'generic');
    const token = await registerWithIndustry(
      app,
      apiPrefix,
      industryId,
      suffix,
    );

    const listRes = await request(app.getHttpServer())
      .get(`/${apiPrefix}/pipelines`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const pipelines = unwrap<PipelineResponse[]>(listRes.body);
    const pipeline = pipelines.find((p) => p.isDefault)!;
    const stageIds = [...pipeline.stages]
      .sort((a, b) => a.position - b.position)
      .map((s) => s.id);
    const reversed = [...stageIds].reverse();

    await request(app.getHttpServer())
      .patch(`/${apiPrefix}/pipelines/${pipeline.id}/stages/reorder`)
      .set('Authorization', `Bearer ${token}`)
      .send({ stageIds: reversed })
      .expect(200);

    const afterReorder = await request(app.getHttpServer())
      .get(`/${apiPrefix}/pipelines/${pipeline.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const updated = unwrap<PipelineResponse>(afterReorder.body);
    expect(updated.stages[0]?.id).toBe(reversed[0]);

    const contactRes = await request(app.getHttpServer())
      .post(`/${apiPrefix}/contacts`)
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: 'Deal Contact', email: `deal-${suffix}@example.com` })
      .expect(201);

    const contact = unwrap<{ id: string }>(contactRes.body);

    await request(app.getHttpServer())
      .post(`/${apiPrefix}/leads/from-contact/${contact.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(201);

    const stageWithLead = updated.stages[0]!;
    await request(app.getHttpServer())
      .delete(
        `/${apiPrefix}/pipelines/${pipeline.id}/stages/${stageWithLead.id}?confirm=true`,
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(409);

    const emptyStage = updated.stages.find(
      (s) => s.id !== stageWithLead.id,
    )!;
    await request(app.getHttpServer())
      .delete(
        `/${apiPrefix}/pipelines/${pipeline.id}/stages/${emptyStage.id}?confirm=true`,
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
