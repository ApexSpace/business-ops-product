import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateAutomationWorkflowDto } from './automation-workflow.dto';

const pipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
};

describe('UpdateAutomationWorkflowDto triggerFilters', () => {
  it('accepts filter value for boolean enrollment filters', async () => {
    const dto = plainToInstance(UpdateAutomationWorkflowDto, {
      name: 'new_contact',
      triggerKey: 'contact.created',
      steps: [{ id: '11111111-1111-4111-8111-111111111111', actionKey: 'workflow.end', config: {} }],
      triggerFilters: [
        {
          fieldKey: 'contact.has_email',
          operator: 'eq',
          value: true,
        },
      ],
    });

    const errors = await validate(dto, pipeOptions);
    expect(errors).toEqual([]);
  });
});
