import { Test, TestingModule } from '@nestjs/testing';
import { HealthMetricsService } from './health-metrics.service';

describe('HealthMetricsService', () => {
  let service: HealthMetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthMetricsService],
    }).compile();

    service = module.get<HealthMetricsService>(HealthMetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
