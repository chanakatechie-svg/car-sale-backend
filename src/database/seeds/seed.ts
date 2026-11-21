/**
 * Seeds the database with:
 *  - the Settings dropdown lists (makes, body types, fuel types, transmissions)
 *  - the first admin account (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD) plus sample staff
 *  - sample vehicle stock (only if the vehicles table is empty)
 *
 * Safe to run repeatedly. Usage: `npm run seed`
 */
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../../app.module';
import { UserRole, UserStatus } from '../../common/enums/user-role.enum';
import { SettingsService } from '../../modules/settings/settings.service';
import { User } from '../../modules/users/entities/user.entity';
import { UsersService } from '../../modules/users/users.service';
import { Vehicle, VehicleStatus } from '../../modules/vehicles/entities/vehicle.entity';
import { seedSettings } from './data/settings.data';
import { seedVehicles } from './data/vehicles.data';

const SAMPLE_STAFF = [
  { name: 'James Mitchell', email: 'james@apexselect.co.uk', role: UserRole.Manager },
  { name: 'Sarah Thompson', email: 'sarah@apexselect.co.uk', role: UserRole.Staff },
];

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    // 1. Settings lists
    await app.get(SettingsService).ensureDefaults(seedSettings);
    console.log('✔ settings lists');

    // 2. Users
    const usersService = app.get(UsersService);
    const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@apexselect.co.uk').toLowerCase();
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin123';

    if (!(await userRepo.exists({ where: { email: adminEmail } }))) {
      await usersService.create({
        name: 'Admin User',
        email: adminEmail,
        role: UserRole.Admin,
        password: adminPassword,
      });
      console.log(`✔ admin user ${adminEmail}`);
    }
    for (const u of SAMPLE_STAFF) {
      if (!(await userRepo.exists({ where: { email: u.email } }))) {
        await usersService.create({ ...u, status: UserStatus.Active, password: 'changeme123' });
        console.log(`✔ sample user ${u.email} (password: changeme123)`);
      }
    }

    // 3. Vehicles
    const vehicleRepo = app.get<Repository<Vehicle>>(getRepositoryToken(Vehicle));
    if ((await vehicleRepo.count()) === 0) {
      const rows = seedVehicles.map(({ id: _id, ...v }) =>
        vehicleRepo.create({
          ...v,
          image: v.image ?? v.images?.[0] ?? '',
          images: v.images ?? (v.image ? [v.image] : []),
          vehicleStatus: v.vehicleStatus ?? VehicleStatus.Unsold,
        }),
      );
      await vehicleRepo.save(rows);
      console.log(`✔ ${rows.length} vehicles`);
    } else {
      console.log('• vehicles table not empty — skipped');
    }

    console.log('Seed complete.');
  } finally {
    await app.close();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
