import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { VehicleStatus } from '../entities/vehicle.entity';

const CURRENT_YEAR = new Date().getFullYear();

export class CreateVehicleDto {
  // ── Core ──────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  make: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  model: string;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  variant?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(CURRENT_YEAR + 1)
  year: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  mileage: number;

  // ── Pricing ───────────────────────────────────────
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  salePrice?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  monthlyPrice?: number;

  @IsBoolean()
  @IsOptional()
  enableRequestPrice?: boolean;

  // ── Classification (validated against Settings lists in the service) ──
  @IsString()
  @IsNotEmpty()
  fuelType: string;

  @IsString()
  @IsNotEmpty()
  transmission: string;

  @IsString()
  @IsOptional()
  bodyType?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  horsepower?: number;

  // ── Media ─────────────────────────────────────────
  /** Image URLs — upload files first via POST /admin/uploads/images. */
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsUrl()
  @IsOptional()
  brochureUrl?: string;

  @IsUrl()
  @IsOptional()
  videoUrl?: string;

  // ── Status ────────────────────────────────────────
  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  @IsEnum(VehicleStatus)
  @IsOptional()
  vehicleStatus?: VehicleStatus;

  // ── Identification ────────────────────────────────
  @IsString()
  @IsOptional()
  @MaxLength(40)
  stockNumber?: string;

  @IsString()
  @IsOptional()
  @Length(11, 17)
  vinNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  registration?: string;

  // ── Specification ─────────────────────────────────
  @IsString() @IsOptional() @MaxLength(80) trim?: string;
  @IsString() @IsOptional() @MaxLength(40) condition?: string;
  @IsString() @IsOptional() @MaxLength(60) engineSize?: string;
  @IsString() @IsOptional() @MaxLength(40) drivetrain?: string;
  @IsString() @IsOptional() @MaxLength(60) fuelEconomy?: string;
  @IsString() @IsOptional() @MaxLength(80) exteriorColor?: string;
  @IsString() @IsOptional() @MaxLength(80) interiorColor?: string;
  @IsString() @IsOptional() @MaxLength(80) colour?: string;
  @IsString() @IsOptional() @MaxLength(20) acceleration?: string;
  @IsString() @IsOptional() @MaxLength(40) taxLabel?: string;

  @Type(() => Number) @IsInt() @Min(0) @IsOptional() doors?: number;
  @Type(() => Number) @IsInt() @Min(0) @IsOptional() seats?: number;
  @Type(() => Number) @IsInt() @Min(0) @IsOptional() topSpeed?: number;
  @Type(() => Number) @IsInt() @Min(0) @IsOptional() co2?: number;
  @Type(() => Number) @IsInt() @Min(0) @IsOptional() mpg?: number;
  @Type(() => Number) @IsInt() @Min(0) @IsOptional() previousOwners?: number;

  @IsString() @IsOptional() @MaxLength(200) serviceHistory?: string;

  // ── Content ───────────────────────────────────────
  @IsArray() @IsString({ each: true }) @IsOptional() features?: string[];
  @IsArray() @IsString({ each: true }) @IsOptional() reviewStamps?: string[];

  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() vehicleOverview?: string;
  @IsString() @IsOptional() featuresAndOptions?: string;
  @IsString() @IsOptional() technicalSpecs?: string;
  @IsString() @IsOptional() generalInfo?: string;
  @IsString() @IsOptional() @MaxLength(200) vehicleLocation?: string;
}
