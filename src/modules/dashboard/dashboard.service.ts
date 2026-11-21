import { Injectable } from '@nestjs/common';
import { EnquiriesService } from '../enquiries/enquiries.service';
import { UsersService } from '../users/users.service';
import { VehiclesService } from '../vehicles/vehicles.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly vehicles: VehiclesService,
    private readonly users: UsersService,
    private readonly enquiries: EnquiriesService,
  ) {}

  /**
   * Everything the admin dashboard (app/admin/page.tsx) currently derives client-side:
   * stat cards, top makes, fuel-type breakdown — plus enquiry counts.
   */
  async overview() {
    const [vehicleStats, activeUsers, totalUsers, enquiryStats] = await Promise.all([
      this.vehicles.stats(),
      this.users.countActive(),
      this.users.count(),
      this.enquiries.stats(),
    ]);

    return {
      vehicles: vehicleStats,
      users: { active: activeUsers, total: totalUsers },
      enquiries: enquiryStats,
    };
  }
}
