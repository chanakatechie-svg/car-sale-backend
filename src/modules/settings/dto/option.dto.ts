import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class AddOptionDto {
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @MaxLength(60)
  value: string;
}

/** Mirrors the frontend `reorderOption({ list, from, to })` action. */
export class ReorderOptionDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  from: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  to: number;
}
