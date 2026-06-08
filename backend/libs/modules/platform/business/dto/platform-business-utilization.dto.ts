import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UtilizationLeadStatsDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  active!: number;

  @ApiProperty()
  won!: number;

  @ApiProperty()
  lost!: number;

  @ApiProperty()
  archived!: number;
}

class UtilizationAppointmentStatsDto {
  @ApiProperty()
  today!: number;

  @ApiProperty()
  upcoming!: number;

  @ApiProperty()
  cancelledOrNoShow!: number;
}

class UtilizationWorkItemStatsDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  scheduled!: number;

  @ApiProperty()
  completed!: number;

  @ApiProperty()
  pending!: number;
}

class UtilizationCrmDto {
  @ApiProperty()
  contacts!: number;

  @ApiProperty({ type: UtilizationLeadStatsDto })
  leads!: UtilizationLeadStatsDto;

  @ApiProperty()
  pipelines!: number;

  @ApiProperty()
  services!: number;

  @ApiProperty()
  tags!: number;
}

class UtilizationOperationsDto {
  @ApiProperty()
  calendars!: number;

  @ApiProperty()
  appointments!: number;

  @ApiProperty({ type: UtilizationAppointmentStatsDto })
  appointmentStats!: UtilizationAppointmentStatsDto;

  @ApiProperty({ type: UtilizationWorkItemStatsDto })
  workItems!: UtilizationWorkItemStatsDto;
}

class UtilizationFinanceDto {
  @ApiProperty()
  estimates!: number;

  @ApiProperty()
  invoices!: number;

  @ApiProperty()
  invoicesPaid!: number;

  @ApiProperty()
  payments!: number;
}

class UtilizationCommunicationsDto {
  @ApiProperty()
  conversations!: number;

  @ApiProperty()
  chatbots!: number;

  @ApiProperty()
  chatbotRules!: number;

  @ApiProperty()
  emailTemplatesCustomized!: number;

  @ApiProperty()
  emailPreferencesEnabled!: number;
}

class UtilizationIntegrationProviderDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  name!: string;
}

class UtilizationIntegrationsDto {
  @ApiProperty()
  connected!: number;

  @ApiProperty({ type: [UtilizationIntegrationProviderDto] })
  providers!: UtilizationIntegrationProviderDto[];
}

class UtilizationTeamDto {
  @ApiProperty()
  activeMembers!: number;

  @ApiProperty()
  invitedMembers!: number;
}

class UtilizationBlueprintDto {
  @ApiPropertyOptional({ nullable: true })
  snapshotId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  snapshotName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  snapshotAppliedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  industryName!: string | null;

  @ApiProperty()
  provisionsByType!: Record<string, number>;
}

class UtilizationActivityDto {
  @ApiPropertyOptional({ nullable: true })
  lastAuditAt!: string | null;
}

export class PlatformBusinessUtilizationDto {
  @ApiProperty({ type: UtilizationCrmDto })
  crm!: UtilizationCrmDto;

  @ApiProperty({ type: UtilizationOperationsDto })
  operations!: UtilizationOperationsDto;

  @ApiProperty({ type: UtilizationFinanceDto })
  finance!: UtilizationFinanceDto;

  @ApiProperty({ type: UtilizationCommunicationsDto })
  communications!: UtilizationCommunicationsDto;

  @ApiProperty({ type: UtilizationIntegrationsDto })
  integrations!: UtilizationIntegrationsDto;

  @ApiProperty({ type: UtilizationTeamDto })
  team!: UtilizationTeamDto;

  @ApiProperty({ type: UtilizationBlueprintDto })
  blueprint!: UtilizationBlueprintDto;

  @ApiProperty({ type: UtilizationActivityDto })
  activity!: UtilizationActivityDto;
}
