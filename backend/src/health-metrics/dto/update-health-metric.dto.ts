import { IsNumber, IsOptional, IsString, IsISO8601 } from 'class-validator';

export class UpdateHealthMetricDto {
  @IsOptional() @IsNumber() bloodGlucoseRandom?: number;
  @IsOptional() @IsNumber() bloodGlucoseFasting?: number;
  @IsOptional() @IsNumber() hba1c?: number;
  @IsOptional() @IsNumber() hemoglobin?: number;
  @IsOptional() @IsNumber() bloodGlucosePostprandial?: number;

  @IsOptional()
  @IsString()
  bloodPressure?: string;

  @IsOptional()
  @IsISO8601()
  dateTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
