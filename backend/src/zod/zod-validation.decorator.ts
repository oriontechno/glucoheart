import { applyDecorators, UsePipes } from '@nestjs/common';
import { ZodSchema } from 'zod';
import { ZodValidationPipe } from './zod.pipe';

/**
 * Decorator untuk validasi Zod yang mudah digunakan
 * @param schema - Zod schema untuk validasi
 */
export function ZodValidation(schema: ZodSchema) {
  return applyDecorators(UsePipes(new ZodValidationPipe(schema)));
}
