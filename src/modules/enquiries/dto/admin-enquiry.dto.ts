import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { EnquiryStatus, EnquiryType } from '../entities/enquiry.entity';

export class QueryEnquiriesDto extends PaginationQueryDto {
  @IsEnum(EnquiryType)
  @IsOptional()
  type?: EnquiryType;

  @IsEnum(EnquiryStatus)
  @IsOptional()
  status?: EnquiryStatus;

  /** Matches name, email or phone. */
  @IsString()
  @IsOptional()
  search?: string;
}

export class UpdateEnquiryDto {
  @IsEnum(EnquiryStatus)
  @IsOptional()
  status?: EnquiryStatus;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  internalNotes?: string;
}
