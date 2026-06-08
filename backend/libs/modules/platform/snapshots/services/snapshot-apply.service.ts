import { HttpStatus, Injectable } from '@nestjs/common';
import {
  CalendarLocationType,
  CalendarStatus,
  ChatbotStatus,
  DayOfWeek,
  Prisma,
  ServiceStatus,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { getEmailTypeDefinition } from '@app/modules/communications/email/email-type.registry';
import {
  defaultSettingsBundle,
  settingsToJson,
} from '@app/modules/communications/chatbots/utils/chatbot-settings.util';
import { generateChatbotPublicKey } from '@app/modules/communications/chatbots/utils/chatbot-public-key.util';
import { DEFAULT_WEEKLY_AVAILABILITY } from '@app/modules/operations/calendars/constants/default-availability';
import { parseSnapshotAssets } from '../mappers/snapshot-assets.parser';
import { SnapshotRepository } from '../repositories/snapshot.repository';
import { SnapshotValidationService } from './snapshot-validation.service';

const SNAPSHOT_APPLY_TX_OPTIONS = {
  timeout: 60_000,
  maxWait: 10_000,
} as const;

const ASSET_TYPES = {
  pipeline: 'pipeline',
  service: 'service',
  tag: 'tag',
  calendar: 'calendar',
  chatbot: 'chatbot',
  chatbotRule: 'chatbot_rule',
  emailPreference: 'email_preference',
  emailTemplate: 'email_template',
} as const;

@Injectable()
export class SnapshotApplyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshotRepository: SnapshotRepository,
    private readonly validationService: SnapshotValidationService,
  ) {}

  async apply(
    businessId: string,
    snapshotId: string,
    _actorUserId?: string,
  ): Promise<void> {
    const snapshot = await this.snapshotRepository.findPublishedById(snapshotId);
    if (!snapshot) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Published snapshot not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const assets = this.validationService.validateAndSanitize(snapshot.assets);

    await this.prisma.$transaction(async (tx) => {
      await tx.business.update({
        where: { id: businessId },
        data: {
          snapshotId: snapshot.id,
          snapshotAppliedAt: new Date(),
        },
      });

      for (const pipeline of assets.crm?.pipelines ?? []) {
        await this.provisionPipeline(tx, businessId, snapshot.id, pipeline);
      }

      for (const service of assets.crm?.services ?? []) {
        await this.provisionService(tx, businessId, snapshot.id, service);
      }

      for (const tag of assets.crm?.tags ?? []) {
        await this.provisionTag(tx, businessId, snapshot.id, tag);
      }

      for (const calendar of assets.calendars ?? []) {
        await this.provisionCalendar(tx, businessId, snapshot.id, calendar);
      }

      for (const chatbot of assets.chatbots ?? []) {
        await this.provisionChatbot(tx, businessId, snapshot.id, chatbot);
      }

      for (const pref of assets.emails?.preferences ?? []) {
        await this.provisionEmailPreference(tx, businessId, snapshot.id, pref);
      }

      for (const template of assets.emails?.templates ?? []) {
        await this.provisionEmailTemplate(tx, businessId, snapshot.id, template);
      }
    }, SNAPSHOT_APPLY_TX_OPTIONS);
  }

  private findProvisionInTx(
    tx: Prisma.TransactionClient,
    businessId: string,
    snapshotId: string,
    sourceKey: string,
  ) {
    return tx.snapshotProvision.findUnique({
      where: {
        businessId_snapshotId_sourceKey: {
          businessId,
          snapshotId,
          sourceKey,
        },
      },
    });
  }

  private async provisionPipeline(
    tx: Prisma.TransactionClient,
    businessId: string,
    snapshotId: string,
    pipeline: NonNullable<
      NonNullable<ReturnType<typeof parseSnapshotAssets>['crm']>['pipelines']
    >[number],
  ) {
    const sourceKey = `pipeline:${pipeline.sourceKey}`;
    const existing = await this.findProvisionInTx(
      tx,
      businessId,
      snapshotId,
      sourceKey,
    );
    if (existing) return;

    const created = await tx.pipeline.create({
      data: {
        businessId,
        name: pipeline.name,
        isDefault: pipeline.isDefault ?? false,
      },
    });

    for (let i = 0; i < pipeline.stages.length; i++) {
      const stage = pipeline.stages[i]!;
      await tx.pipelineStage.create({
        data: {
          businessId,
          pipelineId: created.id,
          name: stage.name,
          position: i + 1,
          type: stage.type ?? null,
        },
      });
    }

    await tx.snapshotProvision.create({
      data: {
        businessId,
        snapshotId,
        assetType: ASSET_TYPES.pipeline,
        sourceKey,
        entityId: created.id,
      },
    });
  }

  private async provisionService(
    tx: Prisma.TransactionClient,
    businessId: string,
    snapshotId: string,
    service: NonNullable<
      NonNullable<ReturnType<typeof parseSnapshotAssets>['crm']>['services']
    >[number],
  ) {
    const sourceKey = `service:${service.sourceKey}`;
    const existing = await this.findProvisionInTx(
      tx,
      businessId,
      snapshotId,
      sourceKey,
    );
    if (existing) return;

    const created = await tx.service.create({
      data: {
        businessId,
        name: service.name,
        category: service.category,
        description: service.description,
        price: service.price,
        status: ServiceStatus.ACTIVE,
      },
    });

    await tx.snapshotProvision.create({
      data: {
        businessId,
        snapshotId,
        assetType: ASSET_TYPES.service,
        sourceKey,
        entityId: created.id,
      },
    });
  }

  private async provisionTag(
    tx: Prisma.TransactionClient,
    businessId: string,
    snapshotId: string,
    tag: NonNullable<
      NonNullable<ReturnType<typeof parseSnapshotAssets>['crm']>['tags']
    >[number],
  ) {
    const sourceKey = `tag:${tag.sourceKey}`;
    const existing = await this.findProvisionInTx(
      tx,
      businessId,
      snapshotId,
      sourceKey,
    );
    if (existing) return;

    const created = await tx.tag.create({
      data: {
        businessId,
        name: tag.name,
        color: tag.color,
      },
    });

    await tx.snapshotProvision.create({
      data: {
        businessId,
        snapshotId,
        assetType: ASSET_TYPES.tag,
        sourceKey,
        entityId: created.id,
      },
    });
  }

  private async provisionCalendar(
    tx: Prisma.TransactionClient,
    businessId: string,
    snapshotId: string,
    calendar: NonNullable<
      ReturnType<typeof parseSnapshotAssets>['calendars']
    >[number],
  ) {
    const sourceKey = `calendar:${calendar.sourceKey}`;
    const existing = await this.findProvisionInTx(
      tx,
      businessId,
      snapshotId,
      sourceKey,
    );
    if (existing) return;

    const created = await tx.calendar.create({
      data: {
        businessId,
        name: calendar.name,
        type: calendar.type ?? 'SERVICE',
        timezone: calendar.timezone ?? 'UTC',
        defaultDurationMinutes: calendar.defaultDurationMinutes ?? 30,
        status: CalendarStatus.ACTIVE,
        locationType: CalendarLocationType.PHYSICAL,
      },
    });

    const availability =
      calendar.availabilityTemplate?.length
        ? calendar.availabilityTemplate.map((slot) => ({
            dayOfWeek: slot.dayOfWeek as DayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isEnabled: slot.isEnabled,
          }))
        : DEFAULT_WEEKLY_AVAILABILITY;

    for (const slot of availability) {
      await tx.calendarAvailability.create({
        data: {
          businessId,
          calendarId: created.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isEnabled: slot.isEnabled,
        },
      });
    }

    await tx.snapshotProvision.create({
      data: {
        businessId,
        snapshotId,
        assetType: ASSET_TYPES.calendar,
        sourceKey,
        entityId: created.id,
      },
    });
  }

  private async provisionChatbot(
    tx: Prisma.TransactionClient,
    businessId: string,
    snapshotId: string,
    chatbot: NonNullable<
      ReturnType<typeof parseSnapshotAssets>['chatbots']
    >[number],
  ) {
    const sourceKey = `chatbot:${chatbot.sourceKey}`;
    const existing = await this.findProvisionInTx(
      tx,
      businessId,
      snapshotId,
      sourceKey,
    );
    if (existing) return;

    const bundle = defaultSettingsBundle({
      appearance: {
        primaryColor: chatbot.primaryColor ?? '#2563eb',
      },
      chatWindow: {
        title: chatbot.widgetTitle ?? chatbot.name,
        introMessage:
          chatbot.welcomeMessage ?? 'Hi there! How can we help you today?',
      },
      messaging: {
        welcomeMessage:
          chatbot.welcomeMessage ?? 'Hi there! How can we help you today?',
      },
    });

    const created = await tx.chatbot.create({
      data: {
        businessId,
        name: chatbot.name,
        status: ChatbotStatus.DRAFT,
        publicKey: generateChatbotPublicKey(),
        ...settingsToJson(bundle),
      },
    });

    await tx.snapshotProvision.create({
      data: {
        businessId,
        snapshotId,
        assetType: ASSET_TYPES.chatbot,
        sourceKey,
        entityId: created.id,
      },
    });

    for (const rule of chatbot.rules ?? []) {
      const ruleSourceKey = `chatbot_rule:${chatbot.sourceKey}:${rule.sourceKey}`;
      const existingRule = await this.findProvisionInTx(
        tx,
        businessId,
        snapshotId,
        ruleSourceKey,
      );
      if (existingRule) continue;

      const createdRule = await tx.chatbotRule.create({
        data: {
          businessId,
          chatbotId: created.id,
          triggerType: rule.triggerType,
          triggerText: rule.triggerText,
          responseText: rule.responseText,
          sortOrder: rule.sortOrder ?? 0,
          isActive: true,
        },
      });

      await tx.snapshotProvision.create({
        data: {
          businessId,
          snapshotId,
          assetType: ASSET_TYPES.chatbotRule,
          sourceKey: ruleSourceKey,
          entityId: createdRule.id,
        },
      });
    }
  }

  private async provisionEmailPreference(
    tx: Prisma.TransactionClient,
    businessId: string,
    snapshotId: string,
    pref: { emailType: string; enabled: boolean },
  ) {
    const sourceKey = `email_preference:${pref.emailType}`;
    const existingProvision = await this.findProvisionInTx(
      tx,
      businessId,
      snapshotId,
      sourceKey,
    );
    if (existingProvision) return;

    const existingPref = await tx.businessEmailPreference.findUnique({
      where: {
        businessId_emailType: { businessId, emailType: pref.emailType },
      },
    });
    if (existingPref) return;

    const created = await tx.businessEmailPreference.create({
      data: {
        businessId,
        emailType: pref.emailType,
        enabled: pref.enabled,
      },
    });

    await tx.snapshotProvision.create({
      data: {
        businessId,
        snapshotId,
        assetType: ASSET_TYPES.emailPreference,
        sourceKey,
        entityId: created.id,
      },
    });
  }

  private async provisionEmailTemplate(
    tx: Prisma.TransactionClient,
    businessId: string,
    snapshotId: string,
    template: {
      emailType: string;
      subject: string;
      htmlBody: string;
      textBody?: string;
    },
  ) {
    const sourceKey = `email_template:${template.emailType}`;
    const existingProvision = await this.findProvisionInTx(
      tx,
      businessId,
      snapshotId,
      sourceKey,
    );
    if (existingProvision) return;

    const existingTemplate = await tx.emailTemplate.findUnique({
      where: {
        businessId_emailType: { businessId, emailType: template.emailType },
      },
    });
    if (existingTemplate) return;

    const def = getEmailTypeDefinition(template.emailType);
    const created = await tx.emailTemplate.create({
      data: {
        businessId,
        emailType: template.emailType,
        subject: template.subject,
        htmlBody: template.htmlBody,
        textBody: template.textBody ?? def?.defaultTextBody ?? null,
      },
    });

    await tx.snapshotProvision.create({
      data: {
        businessId,
        snapshotId,
        assetType: ASSET_TYPES.emailTemplate,
        sourceKey,
        entityId: created.id,
      },
    });
  }
}
