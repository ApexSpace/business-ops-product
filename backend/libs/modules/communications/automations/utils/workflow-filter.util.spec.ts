import { evaluateWorkflowTriggerFilters } from './workflow-filter.util';

describe('evaluateWorkflowTriggerFilters', () => {
  it('passes when no filters', () => {
    expect(evaluateWorkflowTriggerFilters([], { status: 'active' })).toBe(true);
    expect(evaluateWorkflowTriggerFilters(undefined, {})).toBe(true);
  });

  it('evaluates eq and contains operators', () => {
    expect(
      evaluateWorkflowTriggerFilters(
        [{ fieldKey: 'status', operator: 'eq', value: 'completed' }],
        { status: 'completed' },
      ),
    ).toBe(true);

    expect(
      evaluateWorkflowTriggerFilters(
        [{ fieldKey: 'status', operator: 'eq', value: 'completed' }],
        { status: 'cancelled' },
      ),
    ).toBe(false);

    expect(
      evaluateWorkflowTriggerFilters(
        [{ fieldKey: 'title', operator: 'contains', value: 'vip' }],
        { title: 'VIP Client' },
      ),
    ).toBe(true);
  });

  it('evaluates in and exists operators', () => {
    expect(
      evaluateWorkflowTriggerFilters(
        [{ fieldKey: 'stageId', operator: 'in', value: ['a', 'b'] }],
        { stageId: 'b' },
      ),
    ).toBe(true);

    expect(
      evaluateWorkflowTriggerFilters(
        [{ fieldKey: 'email', operator: 'exists', value: true }],
        { email: 'a@b.com' },
      ),
    ).toBe(true);
  });
});
