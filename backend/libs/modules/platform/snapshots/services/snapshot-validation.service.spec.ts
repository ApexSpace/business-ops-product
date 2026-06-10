import { PipelineStageType } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { SNAPSHOT_SEED_DEFINITIONS } from '../seeds/snapshot-seed-definitions';
import { SnapshotValidationService } from './snapshot-validation.service';

describe('SnapshotValidationService', () => {
  const service = new SnapshotValidationService();

  it('accepts valid seeded default-business assets', () => {
    const assets = SNAPSHOT_SEED_DEFINITIONS[0].assets;
    const result = service.validateAndSanitize(assets);
    expect(result.navigation.length).toBeGreaterThan(0);
    expect(result.dashboard.widgets.length).toBeGreaterThan(0);
  });

  it('rejects unknown navigation routes', () => {
    const assets = {
      ...SNAPSHOT_SEED_DEFINITIONS[0].assets,
      navigation: [
        {
          key: 'bad',
          route: '/business/unknown-route',
          icon: 'layout-dashboard',
          labelKey: 'nav.dashboard',
          order: 1,
        },
      ],
    };

    expect(() => service.validateAndSanitize(assets)).toThrow(AppException);
  });

  it('rejects invalid email template types', () => {
    const assets = {
      ...SNAPSHOT_SEED_DEFINITIONS[0].assets,
      emails: {
        templates: [
          {
            emailType: 'auth.password_reset',
            subject: 'Reset',
            htmlBody: '<p>Reset</p>',
          },
        ],
      },
    };

    expect(() => service.validateAndSanitize(assets)).toThrow(AppException);
  });

  it('rejects invalid pipeline stage types', () => {
    const assets = {
      ...SNAPSHOT_SEED_DEFINITIONS[0].assets,
      crm: {
        pipelines: [
          {
            sourceKey: 'bad',
            name: 'Bad Pipeline',
            stages: [{ name: 'Stage', type: 'INVALID' as PipelineStageType }],
          },
        ],
      },
    };

    expect(() => service.validateAndSanitize(assets)).toThrow(AppException);
  });
});
