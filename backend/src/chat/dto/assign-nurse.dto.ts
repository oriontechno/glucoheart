import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignNurseDto {
  @ApiProperty({ description: 'ID of the nurse to assign' })
  @IsInt()
  nurseId: number;
}
