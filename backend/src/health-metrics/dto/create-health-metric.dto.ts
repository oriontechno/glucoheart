import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateHealthMetricDto {
  /** Admin/Support boleh isi, user biasa diabaikan (pakai id token) */
  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsOptional() @IsNumber() bloodGlucoseRandom?: number;
  @IsOptional() @IsNumber() bloodGlucoseFasting?: number;
  @IsOptional() @IsNumber() hba1c?: number;
  @IsOptional() @IsNumber() hemoglobin?: number;
  @IsOptional() @IsNumber() bloodGlucosePostprandial?: number;

  @IsString()
  bloodPressure!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
