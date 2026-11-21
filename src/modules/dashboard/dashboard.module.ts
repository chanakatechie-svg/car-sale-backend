import { Module } from '@nestjs/common';
import { EnquiriesModule } from '../enquiries/enquiries.module';
import { UsersModule } from '../users/users.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [VehiclesModule, UsersModule, EnquiriesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
