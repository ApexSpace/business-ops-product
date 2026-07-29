import { CreateFormDto } from '../dto/create-form.dto';
import { UpdateFormDto } from '../dto/update-form.dto';

/** Platform ops forms never create CRM conversations on submit. */
export function withoutConversationOnSubmit<T extends CreateFormDto | UpdateFormDto>(
  dto: T,
): T {
  if (!dto.definition?.settings) {
    return dto;
  }

  return {
    ...dto,
    definition: {
      ...dto.definition,
      settings: {
        ...dto.definition.settings,
        createConversationOnSubmit: false,
      },
    },
  };
}
