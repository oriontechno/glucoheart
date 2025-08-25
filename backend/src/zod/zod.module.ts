import { Global, Module } from '@nestjs/common';
import { ZodValidationPipe } from './zod.pipe';

@Global()
@Module({
  exports: [ZodValidationPipe],
  providers: [ZodValidationPipe],
})
export class ZodModule {}
