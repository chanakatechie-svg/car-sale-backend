import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { EnquiryType } from '../entities/enquiry.entity';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateEnquiryDto {
  @IsEnum(EnquiryType)
  type: EnquiryType;

  // ── Contact ───────────────────────────────────────
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName: string;

  @Transform(trim)
  @IsString()
  @IsOptional()
  @MaxLength(80)
  lastName?: string;

  /** Required for everything except part-exchange (that form only asks for a phone). */
  @ValidateIf((o: CreateEnquiryDto) => o.type !== EnquiryType.PartExchange || o.email !== undefined)
  @IsEmail()
  email?: string;

  @Transform(trim)
  @Matches(/^[+0-9 ()-]{7,30}$/, { message: 'phone must be a valid phone number' })
  phone: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  message?: string;

  @IsBoolean()
  @IsOptional()
  marketingOptIn?: boolean;

  // ── Test drive / vehicle ──────────────────────────
  @IsUUID()
  @IsOptional()
  vehicleId?: string;

  @ValidateIf((o: CreateEnquiryDto) => o.type === EnquiryType.TestDrive)
  @IsDateString({ strict: true })
  preferredDate?: string;

  @ValidateIf((o: CreateEnquiryDto) => o.type === EnquiryType.TestDrive)
  @Matches(/^\d{2}:\d{2}$/, { message: 'preferredTime must be HH:mm' })
  preferredTime?: string;

  // ── Part exchange ─────────────────────────────────
  @ValidateIf((o: CreateEnquiryDto) => o.type === EnquiryType.PartExchange)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '').toUpperCase() : value,
  )
  @Matches(/^[A-Z0-9]{2,8}$/, { message: 'pxRegistration must be a valid UK registration' })
  pxRegistration?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  pxMileage?: number;

  @IsIn(['excellent', 'good', 'fair', 'poor'])
  @IsOptional()
  pxCondition?: string;

  // ── Finance ───────────────────────────────────────
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  financeAmount?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  financeDeposit?: number;

  @Type(() => Number)
  @IsInt()
  @Min(6)
  @Max(120)
  @IsOptional()
  financeTermMonths?: number;
}
