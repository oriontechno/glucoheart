import { IsNumber, IsOptional, IsString, IsISO8601 } from 'class-validator';

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

  @IsISO8601()
  dateTime!: string; // ISO string

  @IsOptional()
  @IsString()
  notes?: string;
}
