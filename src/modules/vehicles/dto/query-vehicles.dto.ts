import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { VehicleStatus } from '../entities/vehicle.entity';

/** Accepts `?fuelTypes=Petrol,Diesel` or `?fuelTypes=Petrol&fuelTypes=Diesel`. */
const toArray = ({ value }: { value: unknown }) =>
  value === undefined || value === ''
    ? undefined
    : (Array.isArray(value) ? value : String(value).split(','))
        .map((v) => String(v).trim())
        .filter(Boolean);

const toBool = ({ value }: { value: unknown }) =>
  value === 'true' || value === true ? true : value === 'false' || value === false ? false : value;

export const VEHICLE_SORTS = ['newest', 'price-low', 'price-high', 'mileage'] as const;
export type VehicleSort = (typeof VEHICLE_SORTS)[number];

/** Mirrors the frontend `VehicleFilters` (vehicles page). */
export class QueryVehiclesDto extends PaginationQueryDto {
  /** Matches make, model or variant. */
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  make?: string;

  @Type(() => Number) @IsInt() @Min(0) @IsOptional() minPrice?: number;
  @Type(() => Number) @IsInt() @Min(0) @IsOptional() maxPrice?: number;
  @Type(() => Number) @IsInt() @Min(1900) @Max(3000) @IsOptional() yearFrom?: number;
  @Type(() => Number) @IsInt() @Min(1900) @Max(3000) @IsOptional() yearTo?: number;

  @Transform(toArray) @IsArray() @IsString({ each: true }) @IsOptional() fuelTypes?: string[];
  @Transform(toArray) @IsArray() @IsString({ each: true }) @IsOptional() transmissions?: string[];
  @Transform(toArray) @IsArray() @IsString({ each: true }) @IsOptional() bodyTypes?: string[];

  @Transform(toBool)
  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  @IsEnum(VehicleStatus)
  @IsOptional()
  vehicleStatus?: VehicleStatus;

  @IsIn(VEHICLE_SORTS)
  @IsOptional()
  sortBy: VehicleSort = 'newest';

  /**
   * Also return the filter-sidebar facets (same as GET /vehicles/facets) in the
   * same response, so a filter change costs one round trip instead of two.
   */
  @Transform(toBool)
  @IsBoolean()
  @IsOptional()
  includeFacets?: boolean;

  /** Frontend shows 9 per page on /vehicles. */
  limit: number = 9;
}
