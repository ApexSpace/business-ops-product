import { assertActivatableWorkflow } from './workflow-validation.util';

describe('assertActivatableWorkflow', () => {
  it('rejects planned actions on activation', () => {
    expect(() =>
      assertActivatableWorkflow('contact.created', [
        {
          id: 'step-1',
          actionKey: 'communication.send_sms',
          config: {},
        },
      ]),
    ).toThrow('not available for activation');
  });

  it('allows implemented trigger and actions', () => {
    expect(() =>
      assertActivatableWorkflow('contact.created', [
        {
          id: 'step-1',
          actionKey: 'workflow.end',
          config: {},
        },
      ]),
    ).not.toThrow();
  });
});
