export interface IndustryLabels {
  contacts: string;
  pipelines: string;
  leads: string;
  appointments: string;
  conversations: string;
}

export interface IndustryPipelineStageTemplate {
  name: string;
  type?: 'OPEN' | 'WON' | 'LOST';
}

export interface IndustryPipelineTemplate {
  pipelineName: string;
  stages: IndustryPipelineStageTemplate[];
}

export const DEFAULT_INDUSTRY_LABELS: IndustryLabels = {
  contacts: 'Contacts',
  pipelines: 'Pipelines',
  leads: 'Leads',
  appointments: 'Appointments',
  conversations: 'Conversations',
};

export const DEFAULT_PIPELINE_TEMPLATE: IndustryPipelineTemplate = {
  pipelineName: 'Sales Pipeline',
  stages: [
    { name: 'New Lead', type: 'OPEN' },
    { name: 'Contacted', type: 'OPEN' },
    { name: 'Qualified', type: 'OPEN' },
    { name: 'Won', type: 'WON' },
    { name: 'Lost', type: 'LOST' },
  ],
};
