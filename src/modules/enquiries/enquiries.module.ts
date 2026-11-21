import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { AdminEnquiriesController } from './admin-enquiries.controller';
import { EnquiriesController } from './enquiries.controller';
import { EnquiriesService } from './enquiries.service';
import { Enquiry } from './entities/enquiry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Enquiry, Vehicle])],
  controllers: [EnquiriesController, AdminEnquiriesController],
  providers: [EnquiriesService],
  exports: [EnquiriesService],
})
export class EnquiriesModule {}
