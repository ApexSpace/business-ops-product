import { Injectable } from '@nestjs/common';
import type {
  FormFieldCategoryDefinition,
  FormFieldDefinition,
  FormFieldImplementationStatus,
} from '../types/form-registry.types';
import {
  listFormFieldCategories,
} from '../registries/form-field-category.registry';
import { listFormFields } from '../registries/form-field.registry';
import type {
  FormFieldCategoryResponseDto,
  FormFieldTypeResponseDto,
  FormPaletteCategoryResponseDto,
} from '../dto/form-metadata.dto';

type MetadataFilter = {
  categoryKeys?: string[];
  status?: FormFieldImplementationStatus;
  search?: string;
};

@Injectable()
export class FormMetadataService {
  listCategories(): FormFieldCategoryResponseDto[] {
    return listFormFieldCategories().map((category) =>
      this.toCategoryDto(category),
    );
  }

  listFieldTypes(filter: MetadataFilter = {}): FormFieldTypeResponseDto[] {
    return listFormFields(filter).map((field) => this.toFieldTypeDto(field));
  }

  listPalette(filter: MetadataFilter = {}): FormPaletteCategoryResponseDto[] {
    const fields = listFormFields(filter);
    const categories = listFormFieldCategories();

    return categories
      .map((category) => ({
        ...this.toCategoryDto(category),
        fields: fields
          .filter((field) => field.category === category.key)
          .map((field) => this.toFieldTypeDto(field)),
      }))
      .filter((category) => category.fields.length > 0);
  }

  private toCategoryDto(
    category: FormFieldCategoryDefinition,
  ): FormFieldCategoryResponseDto {
    return {
      key: category.key,
      label: category.label,
      description: category.description,
      sortOrder: category.sortOrder,
      icon: category.icon,
    };
  }

  private toFieldTypeDto(
    field: FormFieldDefinition,
  ): FormFieldTypeResponseDto {
    return {
      key: field.key,
      category: field.category,
      label: field.label,
      description: field.description,
      icon: field.icon,
      role: field.role,
      implementationStatus: field.implementationStatus,
      countsAsInput: field.countsAsInput,
      supportsOptions: field.supportsOptions,
      supportsValidation: field.supportsValidation,
      supportsPlaceholder: field.supportsPlaceholder,
      supportsLabel: field.supportsLabel,
      supportsInputStyle: field.supportsInputStyle,
      supportsLabelStyle: field.supportsLabelStyle,
      supportsLayout: field.supportsLayout,
    };
  }
}
