import { HttpStatus, Injectable } from '@nestjs/common';
import {
  IntegrationStatus,
  InvoiceStatus,
  MembershipStatus,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { PlatformBusinessUtilizationDto } from '../dto/platform-business-utilization.dto';
import { DashboardStatsService } from './dashboard-stats.service';

@Injectable()
export class PlatformBusinessUtilizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardStatsService: DashboardStatsService,
  ) {}

  async getUtilization(businessId: string): Promise<PlatformBusinessUtilizationDto> {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
      select: {
        id: true,
        snapshotId: true,
        snapshotAppliedAt: true,
        industry: { select: { name: true } },
        snapshot: { select: { id: true, name: true } },
      },
    });

    if (!business) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const [
      dashboardStats,
      services,
      tags,
      calendars,
      estimates,
      invoices,
      payments,
      conversations,
      chatbots,
      chatbotRules,
      emailTemplatesCustomized,
      emailPreferencesEnabled,
      invoicesPaid,
      connectedIntegrations,
      invitedMembers,
      provisionGroups,
      lastAudit,
    ] = await Promise.all([
      this.dashboardStatsService.getStats(businessId),
      this.prisma.service.count({ where: { businessId, deletedAt: null } }),
      this.prisma.tag.count({ where: { businessId } }),
      this.prisma.calendar.count({ where: { businessId, deletedAt: null } }),
      this.prisma.estimate.count({ where: { businessId, deletedAt: null } }),
      this.prisma.invoice.count({ where: { businessId, deletedAt: null } }),
      this.prisma.payment.count({ where: { businessId, deletedAt: null } }),
      this.prisma.conversation.count({ where: { businessId, deletedAt: null } }),
      this.prisma.chatbot.count({ where: { businessId, deletedAt: null } }),
      this.prisma.chatbotRule.count({ where: { businessId } }),
      this.prisma.emailTemplate.count({ where: { businessId } }),
      this.prisma.businessEmailPreference.count({
        where: { businessId, enabled: true },
      }),
      this.prisma.invoice.count({
        where: {
          businessId,
          deletedAt: null,
          status: InvoiceStatus.PAID,
        },
      }),
      this.prisma.businessIntegration.findMany({
        where: { businessId, status: IntegrationStatus.CONNECTED },
        select: {
          providerKey: true,
          provider: { select: { name: true } },
        },
        orderBy: { providerKey: 'asc' },
      }),
      this.prisma.businessMembership.count({
        where: {
          businessId,
          deletedAt: null,
          status: MembershipStatus.INVITED,
        },
      }),
      this.prisma.snapshotProvision.groupBy({
        by: ['assetType'],
        where: { businessId },
        _count: { _all: true },
      }),
      this.prisma.auditLog.findFirst({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    const provisionsByType = Object.fromEntries(
      provisionGroups.map((row) => [row.assetType, row._count._all]),
    );

    return {
      crm: {
        contacts: dashboardStats.contacts,
        leads: dashboardStats.leads,
        pipelines: dashboardStats.pipelines,
        services,
        tags,
      },
      operations: {
        calendars,
        appointments: dashboardStats.appointments,
        appointmentStats: dashboardStats.appointmentStats,
        workItems: dashboardStats.workItems,
      },
      finance: {
        estimates,
        invoices,
        invoicesPaid,
        payments,
      },
      communications: {
        conversations,
        chatbots,
        chatbotRules,
        emailTemplatesCustomized,
        emailPreferencesEnabled,
      },
      integrations: {
        connected: connectedIntegrations.length,
        providers: connectedIntegrations.map((row) => ({
          key: row.providerKey,
          name: row.provider.name,
        })),
      },
      team: {
        activeMembers: dashboardStats.members,
        invitedMembers,
      },
      blueprint: {
        snapshotId: business.snapshotId,
        snapshotName: business.snapshot?.name ?? null,
        snapshotAppliedAt: business.snapshotAppliedAt,
        industryName: business.industry?.name ?? null,
        provisionsByType,
      },
      activity: {
        lastAuditAt: lastAudit?.createdAt.toISOString() ?? null,
      },
    };
  }
}
