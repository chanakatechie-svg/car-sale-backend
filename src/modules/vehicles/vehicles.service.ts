import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Brackets, IsNull, Like, Not, Repository, SelectQueryBuilder } from 'typeorm';
import { slugIdCode, vehicleSlug } from './vehicle-slug';
import { skipOf } from '../../common/dto/pagination-query.dto';
import { paginate } from '../../common/interfaces/paginated-result.interface';
import { OptionList } from '../settings/entities/setting-option.entity';
import { SettingsService } from '../settings/settings.service';
import { StorageService } from '../uploads/storage.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { QueryVehiclesDto } from './dto/query-vehicles.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle, VehicleStatus } from './entities/vehicle.entity';

/** What the customer pays: the sale price when set, otherwise the regular price. */
const EFFECTIVE_PRICE = 'COALESCE(v.salePrice, v.price)';

/** Filter dimensions that get per-option counts in `facets()`. */
type FacetKey = 'make' | 'fuelTypes' | 'transmissions' | 'bodyTypes';

/** Changing any of these renames the vehicle's URL. */
const SLUG_FIELDS = ['year', 'make', 'model', 'variant'] as const;

@Injectable()
export class VehiclesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    private readonly settings: SettingsService,
    private readonly storage: StorageService,
  ) {}

  /** Give every vehicle created before slugs existed its SEO URL. */
  async onApplicationBootstrap() {
    const missing = await this.vehicles.find({ where: { slug: IsNull() } });
    for (const v of missing) {
      v.slug = await this.uniqueSlug(v);
      await this.vehicles.save(v);
    }
    if (missing.length) this.logger.log(`Generated SEO slugs for ${missing.length} vehicles`);
  }

  // ── SEO URLs ──────────────────────────────────────

  /**
   * GET /vehicles/slug/:slug. Exact match first; otherwise resolve by the id code
   * at the end of the slug (the vehicle was renamed) — the caller then redirects
   * to the returned `slug`, which is the canonical URL.
   */
  async findBySlug(slug: string) {
    const exact = await this.vehicles.findOne({ where: { slug } });
    if (exact) return exact;

    const code = slugIdCode(slug);
    if (code) {
      const matches = await this.vehicles.find({ where: { id: Like(`${code}%`) }, take: 2 });
      if (matches.length === 1) return matches[0];
    }
    throw new NotFoundException('Vehicle not found');
  }

  /** Lightweight list for sitemap.xml: every vehicle's slug and last-modified time. */
  async sitemapEntries() {
    const rows = await this.vehicles.find({
      select: { slug: true, updatedAt: true, vehicleStatus: true, image: true },
      where: { slug: Not(IsNull()) },
      order: { updatedAt: 'DESC' },
    });
    return rows.map(({ slug, updatedAt, vehicleStatus, image }) => ({
      slug,
      updatedAt,
      vehicleStatus,
      image: image || null,
    }));
  }

  /** Slug for this vehicle; falls back to the full id if the short form is somehow taken. */
  private async uniqueSlug(v: Vehicle): Promise<string> {
    const slug = vehicleSlug(v);
    const clash = await this.vehicles.findOne({ where: { slug, id: Not(v.id) } });
    if (!clash) return slug;
    return `${slug.slice(0, -8)}${v.id.replace(/-/g, '')}`;
  }

  async findAll(query: QueryVehiclesDto) {
    const qb = this.vehicles.createQueryBuilder('v');
    this.applyFilters(qb, query);
    this.applySort(qb, query.sortBy);

    const [data, total] = await qb.skip(skipOf(query)).take(query.limit).getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }

  /** One page of results plus sidebar facets, queried in parallel (one HTTP round trip). */
  async findAllWithFacets(query: QueryVehiclesDto) {
    const [page, facets] = await Promise.all([this.findAll(query), this.facets(query)]);
    return { ...page, facets };
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
    // Assign the id up front so the slug (which ends with an id prefix) can be built before insert.
    const vehicle = this.vehicles.create({ ...this.normalise(dto), id: randomUUID() });
    vehicle.slug = await this.uniqueSlug(vehicle);
    return this.vehicles.save(vehicle);
  }

  async update(id: string, dto: UpdateVehicleDto) {
    const vehicle = await this.findOne(id);
    await this.validateOptions(dto);
    const before = this.fileUrls(vehicle);
    const titleChanged = SLUG_FIELDS.some(
      (f) => dto[f] !== undefined && dto[f] !== vehicle[f],
    );
    Object.assign(vehicle, this.normalise(dto));
    if (titleChanged || !vehicle.slug) vehicle.slug = await this.uniqueSlug(vehicle);
    const saved = await this.vehicles.save(vehicle);

    // Delete uploaded files the vehicle no longer uses (removed images, replaced brochure…).
    const after = new Set(this.fileUrls(saved));
    await this.storage.deleteByUrls(before.filter((u) => !after.has(u)));
    return saved;
  }

  async remove(id: string) {
    const vehicle = await this.findOne(id);
    const files = this.fileUrls(vehicle);
    await this.vehicles.remove(vehicle);
    await this.storage.deleteByUrls(files);
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

  // ── Facets for the public /vehicles filter sidebar ─
  /**
   * Price/year bounds of the whole stock (so the slider and year pickers match
   * real data) plus per-option counts. Each dimension's counts apply every other
   * active filter but not its own, so a customer can see how many cars they'd
   * get by ticking another option.
   */
  async facets(q: QueryVehiclesDto) {
    const countBy = (column: 'make' | 'fuelType' | 'transmission' | 'bodyType', exclude: FacetKey) => {
      const qb = this.vehicles
        .createQueryBuilder('v')
        .select(`v.${column}`, 'name')
        .addSelect('COUNT(*)', 'count');
      this.applyFilters(qb, q, exclude);
      return qb
        .groupBy(`v.${column}`)
        .orderBy('count', 'DESC')
        .getRawMany<{ name: string; count: string }>()
        .then((rows) =>
          rows.filter((r) => r.name).map((r) => ({ name: r.name, count: Number(r.count) })),
        );
    };

    const totalQb = this.vehicles.createQueryBuilder('v');
    this.applyFilters(totalQb, q);

    const [bounds, total, makes, fuelTypes, transmissions, bodyTypes] = await Promise.all([
      this.vehicles
        .createQueryBuilder('v')
        .select(`MIN(${EFFECTIVE_PRICE})`, 'minPrice')
        .addSelect(`MAX(${EFFECTIVE_PRICE})`, 'maxPrice')
        .addSelect('MIN(v.year)', 'minYear')
        .addSelect('MAX(v.year)', 'maxYear')
        .addSelect('MAX(v.mileage)', 'maxMileage')
        .getRawOne<Record<string, string | null>>(),
      totalQb.getCount(),
      countBy('make', 'make'),
      countBy('fuelType', 'fuelTypes'),
      countBy('transmission', 'transmissions'),
      countBy('bodyType', 'bodyTypes'),
    ]);

    const num = (v: string | null | undefined) => (v == null ? null : Number(v));
    return {
      total,
      price: { min: num(bounds?.minPrice) ?? 0, max: num(bounds?.maxPrice) ?? 0 },
      year: { min: num(bounds?.minYear), max: num(bounds?.maxYear) },
      maxMileage: num(bounds?.maxMileage) ?? 0,
      makes,
      fuelTypes,
      transmissions,
      bodyTypes,
    };
  }

  // ── Helpers ───────────────────────────────────────
  private applyFilters(qb: SelectQueryBuilder<Vehicle>, q: QueryVehiclesDto, exclude?: FacetKey) {
    if (q.search) {
      // Every word must match somewhere, so "BMW 3 Series" or "electric SUV" work.
      const words = q.search.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
      words.forEach((word, i) => {
        const p = `term${i}`;
        qb.andWhere(
          new Brackets((w) =>
            w
              .where(`LOWER(v.make) LIKE :${p}`)
              .orWhere(`LOWER(v.model) LIKE :${p}`)
              .orWhere(`LOWER(v.variant) LIKE :${p}`)
              .orWhere(`LOWER(v.bodyType) LIKE :${p}`)
              .orWhere(`LOWER(v.fuelType) LIKE :${p}`),
          ),
          { [p]: `%${word.replace(/[\\%_]/g, (c) => `\\${c}`)}%` },
        );
      });
    }
    if (q.make && exclude !== 'make') qb.andWhere('LOWER(v.make) = LOWER(:make)', { make: q.make });
    // Price filters use what the customer actually pays (sale price when set).
    if (q.minPrice !== undefined)
      qb.andWhere(`${EFFECTIVE_PRICE} >= :minPrice`, { minPrice: q.minPrice });
    if (q.maxPrice !== undefined)
      qb.andWhere(`${EFFECTIVE_PRICE} <= :maxPrice`, { maxPrice: q.maxPrice });
    if (q.yearFrom !== undefined) qb.andWhere('v.year >= :yearFrom', { yearFrom: q.yearFrom });
    if (q.yearTo !== undefined) qb.andWhere('v.year <= :yearTo', { yearTo: q.yearTo });
    if (q.fuelTypes?.length && exclude !== 'fuelTypes')
      qb.andWhere('v.fuelType IN (:...fuelTypes)', { fuelTypes: q.fuelTypes });
    if (q.transmissions?.length && exclude !== 'transmissions')
      qb.andWhere('v.transmission IN (:...transmissions)', { transmissions: q.transmissions });
    if (q.bodyTypes?.length && exclude !== 'bodyTypes')
      qb.andWhere('v.bodyType IN (:...bodyTypes)', { bodyTypes: q.bodyTypes });
    if (q.featured !== undefined) qb.andWhere('v.featured = :featured', { featured: q.featured });
    if (q.vehicleStatus) qb.andWhere('v.vehicleStatus = :vs', { vs: q.vehicleStatus });
  }

  private applySort(qb: SelectQueryBuilder<Vehicle>, sortBy: QueryVehiclesDto['sortBy']) {
    switch (sortBy) {
      case 'price-low':
        qb.addSelect(EFFECTIVE_PRICE, 'effective_price').orderBy('effective_price', 'ASC');
        break;
      case 'price-high':
        qb.addSelect(EFFECTIVE_PRICE, 'effective_price').orderBy('effective_price', 'DESC');
        break;
      case 'mileage':
        qb.orderBy('v.mileage', 'ASC');
        break;
      case 'newest':
      default:
        qb.orderBy('v.year', 'DESC').addOrderBy('v.createdAt', 'DESC');
    }
  }

  /** Every file URL a vehicle points at. Only ones in our own storage are ever deleted. */
  private fileUrls(v: Vehicle): string[] {
    return [v.image, ...(v.images ?? []), v.brochureUrl ?? ''].filter(Boolean);
  }

  /** Keeps `image` in sync with `images[0]`, as the frontend expects. */
  private normalise<T extends Partial<CreateVehicleDto>>(dto: T): T & { image?: string } {
    if (dto.images === undefined) return dto;
    return { ...dto, image: dto.images[0] ?? '' };
  }

  /** Every dropdown attribute must exist in its admin Settings list (empty optional ones are skipped). */
  private async validateOptions(dto: Partial<CreateVehicleDto>) {
    const checks: [OptionList, string | undefined, string][] = [
      [OptionList.Makes, dto.make, 'make'],
      [OptionList.FuelTypes, dto.fuelType, 'fuelType'],
      [OptionList.Transmissions, dto.transmission, 'transmission'],
      [OptionList.BodyTypes, dto.bodyType || undefined, 'bodyType'],
      [OptionList.Conditions, dto.condition || undefined, 'condition'],
      [OptionList.Drivetrains, dto.drivetrain || undefined, 'drivetrain'],
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
