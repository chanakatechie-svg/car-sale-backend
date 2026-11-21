import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { EnquiriesService } from './enquiries.service';

/** Public website forms: Contact (test drive), Part Exchange, Finance. */
@ApiTags('Enquiries')
@Public()
@Controller('enquiries')
export class EnquiriesController {
  constructor(private readonly enquiriesService: EnquiriesService) {}

  @Throttle({ default: { ttl: 60_000, limit: 5 } }) // spam protection
  @Post()
  create(@Body() dto: CreateEnquiryDto) {
    return this.enquiriesService.create(dto);
  }
}
