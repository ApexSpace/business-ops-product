import { HttpStatus } from '@nestjs/common';
import sharp from 'sharp';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';

export const PRODUCT_ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const PRODUCT_MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const PRODUCT_MIN_IMAGE_DIMENSION = 800;

export type ProductImageValidationInput = {
  mimeType: string;
  size: number;
  buffer: Buffer;
};

export type ProductImageDimensions = {
  width: number;
  height: number;
};

export async function validateProductImage(
  input: ProductImageValidationInput,
): Promise<ProductImageDimensions> {
  if (
    !PRODUCT_ALLOWED_IMAGE_MIME_TYPES.includes(
      input.mimeType as (typeof PRODUCT_ALLOWED_IMAGE_MIME_TYPES)[number],
    )
  ) {
    throw new AppException(
      ErrorCode.BAD_REQUEST,
      `Product image MIME type not allowed: ${input.mimeType}`,
      HttpStatus.BAD_REQUEST,
    );
  }

  if (input.size > PRODUCT_MAX_IMAGE_SIZE_BYTES) {
    throw new AppException(
      ErrorCode.BAD_REQUEST,
      `Product image exceeds maximum size of ${PRODUCT_MAX_IMAGE_SIZE_BYTES} bytes`,
      HttpStatus.BAD_REQUEST,
    );
  }

  const metadata = await sharp(input.buffer).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (width < PRODUCT_MIN_IMAGE_DIMENSION || height < PRODUCT_MIN_IMAGE_DIMENSION) {
    throw new AppException(
      ErrorCode.BAD_REQUEST,
      `Product image must be at least ${PRODUCT_MIN_IMAGE_DIMENSION}x${PRODUCT_MIN_IMAGE_DIMENSION} pixels`,
      HttpStatus.BAD_REQUEST,
    );
  }

  return { width, height };
}
