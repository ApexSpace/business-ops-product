import { Industry } from '@prisma/client';
import { IndustryOptionDto, IndustryResponseDto } from '../dto/industry.dto';
import {
  DEFAULT_INDUSTRY_LABELS,
  DEFAULT_PIPELINE_TEMPLATE,
  IndustryLabels,
  IndustryPipelineTemplate,
} from '../types/industry.types';

function parseLabels(raw: unknown): IndustryLabels {
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    return {
      contacts: String(o.contacts ?? DEFAULT_INDUSTRY_LABELS.contacts),
      pipelines: String(o.pipelines ?? DEFAULT_INDUSTRY_LABELS.pipelines),
      leads: String(o.leads ?? DEFAULT_INDUSTRY_LABELS.leads),
      appointments: String(
        o.appointments ?? DEFAULT_INDUSTRY_LABELS.appointments,
      ),
      conversations: String(
        o.conversations ?? DEFAULT_INDUSTRY_LABELS.conversations,
      ),
    };
  }
  return DEFAULT_INDUSTRY_LABELS;
}

function parsePipelineTemplate(raw: unknown): IndustryPipelineTemplate {
  if (raw && typeof raw === 'object') {
    const o = raw as IndustryPipelineTemplate;
    if (o.pipelineName && Array.isArray(o.stages) && o.stages.length > 0) {
      return o;
    }
  }
  return DEFAULT_PIPELINE_TEMPLATE;
}

export function toIndustryResponse(industry: Industry): IndustryResponseDto {
  return {
    id: industry.id,
    name: industry.name,
    slug: industry.slug,
    description: industry.description,
    labels: parseLabels(industry.labels),
    pipelineTemplate: parsePipelineTemplate(industry.pipelineTemplate),
    status: industry.status,
    sortOrder: industry.sortOrder,
    createdAt: industry.createdAt,
    updatedAt: industry.updatedAt,
  };
}

export function toIndustryOption(industry: Industry): IndustryOptionDto {
  return {
    id: industry.id,
    name: industry.name,
    slug: industry.slug,
    labels: parseLabels(industry.labels),
  };
}

export { parseLabels, parsePipelineTemplate };
