import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { skipOf } from '../../common/dto/pagination-query.dto';
import { paginate } from '../../common/interfaces/paginated-result.interface';
import { OptionList } from '../settings/entities/setting-option.entity';
import { SettingsService } from '../settings/settings.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { QueryVehiclesDto } from './dto/query-vehicles.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle, VehicleStatus } from './entities/vehicle.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    private readonly settings: SettingsService,
  ) {}

  async findAll(query: QueryVehiclesDto) {
    const qb = this.vehicles.createQueryBuilder('v');
    this.applyFilters(qb, query);
    this.applySort(qb, query.sortBy);

    const [data, total] = await qb.skip(skipOf(query)).take(query.limit).getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }

  findFeatured(limit = 6) {
    return this.vehicles.find({
      where: { featured: true },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findOne(id: string) {
    const vehicle = await this.vehicles.findOne({ where: { id } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  /** Other cars with the same make or body type — for the vehicle detail page. */
  async findSimilar(id: string, limit = 3) {
    const vehicle = await this.findOne(id);
    return this.vehicles
      .createQueryBuilder('v')
      .where('v.id != :id', { id })
      .andWhere('v.vehicleStatus = :status', { status: VehicleStatus.Unsold })
      .andWhere(
        new Brackets((w) =>
          w
            .where('v.make = :make', { make: vehicle.make })
            .orWhere('v.bodyType = :bodyType', { bodyType: vehicle.bodyType }),
        ),
      )
      .orderBy('ABS(v.price - :price)', 'ASC')
      .setParameter('price', vehicle.price)
      .take(limit)
      .getMany();
  }

  async create(dto: CreateVehicleDto) {
    await this.validateOptions(dto);
    const vehicle = this.vehicles.create(this.normalise(dto));
    return this.vehicles.save(vehicle);
  }

  async update(id: string, dto: UpdateVehicleDto) {
    const vehicle = await this.findOne(id);
    await this.validateOptions(dto);
    Object.assign(vehicle, this.normalise(dto));
    return this.vehicles.save(vehicle);
  }

  async remove(id: string) {
    const vehicle = await this.findOne(id);
    await this.vehicles.remove(vehicle);
  }

  async setFeatured(id: string, featured: boolean) {
    const vehicle = await this.findOne(id);
    vehicle.featured = featured;
    return this.vehicles.save(vehicle);
  }

  async setStatus(id: string, vehicleStatus: VehicleStatus) {
    const vehicle = await this.findOne(id);
    vehicle.vehicleStatus = vehicleStatus;
    return this.vehicles.save(vehicle);
  }

  // ── Stats used by the admin dashboard ─────────────
  async stats() {
    const totals = await this.vehicles
      .createQueryBuilder('v')
      .select('COUNT(*)', 'total')
      .addSelect('COALESCE(SUM(v.price), 0)', 'stockValue')
      .addSelect('ROUND(COALESCE(AVG(v.price), 0))', 'avgPrice')
      .addSelect('COALESCE(SUM(CASE WHEN v.featured = 1 THEN 1 ELSE 0 END), 0)', 'featured')
      .addSelect(
        `COALESCE(SUM(CASE WHEN v.vehicleStatus = '${VehicleStatus.Sold}' THEN 1 ELSE 0 END), 0)`,
        'sold',
      )
      .getRawOne<Record<'total' | 'stockValue' | 'avgPrice' | 'featured' | 'sold', string>>();

    const groupBy = (column: 'make' | 'fuelType' | 'bodyType') =>
      this.vehicles
        .createQueryBuilder('v')
        .select(`v.${column}`, 'name')
        .addSelect('COUNT(*)', 'count')
        .groupBy(`v.${column}`)
        .orderBy('count', 'DESC')
        .getRawMany<{ name: string; count: string }>()
        .then((rows) => rows.map((r) => ({ name: r.name, count: Number(r.count) })));

    const [byMake, byFuelType, byBodyType] = await Promise.all([
      groupBy('make'),
      groupBy('fuelType'),
      groupBy('bodyType'),
    ]);

    return {
      total: Number(totals?.total ?? 0),
      stockValue: Number(totals?.stockValue ?? 0),
      avgPrice: Number(totals?.avgPrice ?? 0),
      featured: Number(totals?.featured ?? 0),
      sold: Number(totals?.sold ?? 0),
      byMake,
      byFuelType,
      byBodyType,
    };
  }

  // ── Helpers ───────────────────────────────────────
  private applyFilters(qb: SelectQueryBuilder<Vehicle>, q: QueryVehiclesDto) {
    if (q.search) {
      const term = `%${q.search.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('LOWER(v.make) LIKE :term', { term })
            .orWhere('LOWER(v.model) LIKE :term', { term })
            .orWhere('LOWER(v.variant) LIKE :term', { term }),
        ),
      );
    }
    if (q.make) qb.andWhere('LOWER(v.make) = LOWER(:make)', { make: q.make });
    if (q.minPrice !== undefined) qb.andWhere('v.price >= :minPrice', { minPrice: q.minPrice });
    if (q.maxPrice !== undefined) qb.andWhere('v.price <= :maxPrice', { maxPrice: q.maxPrice });
    if (q.yearFrom !== undefined) qb.andWhere('v.year >= :yearFrom', { yearFrom: q.yearFrom });
    if (q.yearTo !== undefined) qb.andWhere('v.year <= :yearTo', { yearTo: q.yearTo });
    if (q.fuelTypes?.length)
      qb.andWhere('v.fuelType IN (:...fuelTypes)', { fuelTypes: q.fuelTypes });
    if (q.transmissions?.length)
      qb.andWhere('v.transmission IN (:...transmissions)', { transmissions: q.transmissions });
    if (q.bodyTypes?.length)
      qb.andWhere('v.bodyType IN (:...bodyTypes)', { bodyTypes: q.bodyTypes });
    if (q.featured !== undefined) qb.andWhere('v.featured = :featured', { featured: q.featured });
    if (q.vehicleStatus) qb.andWhere('v.vehicleStatus = :vs', { vs: q.vehicleStatus });
  }

  private applySort(qb: SelectQueryBuilder<Vehicle>, sortBy: QueryVehiclesDto['sortBy']) {
    switch (sortBy) {
      case 'price-low':
        qb.orderBy('v.price', 'ASC');
        break;
      case 'price-high':
        qb.orderBy('v.price', 'DESC');
        break;
      case 'mileage':
        qb.orderBy('v.mileage', 'ASC');
        break;
      case 'newest':
      default:
        qb.orderBy('v.year', 'DESC').addOrderBy('v.createdAt', 'DESC');
    }
  }

  /** Keeps `image` in sync with `images[0]`, as the frontend expects. */
  private normalise<T extends Partial<CreateVehicleDto>>(dto: T): T & { image?: string } {
    if (dto.images === undefined) return dto;
    return { ...dto, image: dto.images[0] ?? '' };
  }

  /** Make / fuel / transmission / body type must exist in the admin Settings lists. */
  private async validateOptions(dto: Partial<CreateVehicleDto>) {
    const checks: [OptionList, string | undefined, string][] = [
      [OptionList.Makes, dto.make, 'make'],
      [OptionList.FuelTypes, dto.fuelType, 'fuelType'],
      [OptionList.Transmissions, dto.transmission, 'transmission'],
      [OptionList.BodyTypes, dto.bodyType || undefined, 'bodyType'],
    ];
    const errors: string[] = [];
    for (const [list, value, field] of checks) {
      if (value !== undefined && !(await this.settings.hasOption(list, value))) {
        errors.push(`${field} "${value}" is not in the configured ${list} list`);
      }
    }
    if (errors.length) throw new BadRequestException(errors);
  }
}
