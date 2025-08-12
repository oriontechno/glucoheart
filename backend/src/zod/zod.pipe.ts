import {
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors untuk response yang lebih user-friendly
        const formattedErrors = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
          received: 'received' in issue ? issue.received : undefined,
        }));

        throw new BadRequestException({
          message: 'Validation failed',
          statusCode: 400,
          errors: formattedErrors,
        });
      }

      // Untuk error lain yang bukan ZodError
      throw new BadRequestException('Validation failed');
    }
  }
}
