import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { QueryEnquiriesDto, UpdateEnquiryDto } from './dto/admin-enquiry.dto';
import { EnquiriesService } from './enquiries.service';

/** Admin panel → Enquiries (leads inbox). No frontend page yet. */
@ApiTags('Admin / Enquiries')
@ApiBearerAuth()
@Roles(UserRole.Admin, UserRole.Manager, UserRole.Staff)
@Controller('admin/enquiries')
export class AdminEnquiriesController {
  constructor(private readonly enquiriesService: EnquiriesService) {}

  @Get()
  findAll(@Query() query: QueryEnquiriesDto) {
    return this.enquiriesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.enquiriesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEnquiryDto) {
    return this.enquiriesService.update(id, dto);
  }

  @Roles(UserRole.Admin, UserRole.Manager)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.enquiriesService.remove(id);
  }
}
