import { Module, forwardRef } from '@nestjs/common';
import { HealthMetricsService } from './health-metrics.service';
import { HealthMetricsController } from './health-metrics.controller';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../db/database.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    DatabaseModule, // pakai forwardRef jika ada potensi circular
  ],
  controllers: [HealthMetricsController],
  providers: [HealthMetricsService],
  exports: [HealthMetricsService],
})
export class HealthMetricsModule {}
