import { Injectable } from '@nestjs/common';
import { CONDITION_BY_KEY } from '../registries/condition.registry';
import type { AutomationDomainEventPayload } from '../types/domain-event.types';
import type { WorkflowTriggerFilter } from '../types/workflow.types';
import { buildAutomationRunContext } from '../utils/automation-run-context.util';
import { evaluateWorkflowTriggerFilters } from '../utils/workflow-filter.util';
import { ConditionEvaluatorService } from './condition-evaluator.service';

@Injectable()
export class EnrollmentFilterService {
  constructor(private readonly conditionEvaluator: ConditionEvaluatorService) {}

  async evaluate(
    filters: WorkflowTriggerFilter[] | null | undefined,
    event: AutomationDomainEventPayload,
    contactId?: string,
  ): Promise<boolean> {
    if (!filters?.length) {
      return true;
    }

    const context = buildAutomationRunContext({
      event,
      workflowId: 'enrollment-check',
      runId: 'enrollment-check',
      contactId,
    });

    for (const filter of filters) {
      const condition = CONDITION_BY_KEY[filter.fieldKey];
      if (condition?.implementationStatus === 'implemented') {
        const passed = await this.conditionEvaluator.evaluate(
          context,
          filter.fieldKey,
          filter.operator,
          filter.value,
        );
        if (!passed) {
          return false;
        }
        continue;
      }

      if (!evaluateWorkflowTriggerFilters([filter], event.metadata)) {
        return false;
      }
    }

    return true;
  }
}
