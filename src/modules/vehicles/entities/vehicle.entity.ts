import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum VehicleStatus {
  Sold = 'sold',
  Unsold = 'unsold',
}

/**
 * Mirrors the frontend `Vehicle` type (car-sale/src/redux/vehicles/vehiclesTypes.ts).
 * Make / fuel type / transmission / body type are free text validated against the
 * admin-managed Settings lists rather than DB enums, so admins can add new options.
 */
@Entity('vehicles')
@Index(['make', 'model'])
export class Vehicle extends BaseEntity {
  // ── Core ──────────────────────────────────────────
  @Column({ length: 60 })
  make: string;

  @Column({ length: 80 })
  model: string;

  @Column({ length: 160, default: '' })
  variant: string;

  @Index()
  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int' })
  mileage: number;

  // ── Pricing (whole pounds) ────────────────────────
  @Index()
  @Column({ type: 'int' })
  price: number;

  @Column({ type: 'int', nullable: true })
  salePrice: number | null;

  @Column({ type: 'int', default: 0 })
  monthlyPrice: number;

  @Column({ default: false })
  enableRequestPrice: boolean;

  // ── Classification ────────────────────────────────
  @Column({ length: 40 })
  fuelType: string;

  @Column({ length: 40 })
  transmission: string;

  @Column({ length: 40, default: '' })
  bodyType: string;

  @Column({ type: 'int', default: 0 })
  horsepower: number;

  // ── Media ─────────────────────────────────────────
  /** Primary image — kept in sync with images[0]. */
  @Column({ type: 'varchar', length: 500, default: '' })
  image: string;

  @Column({ type: 'simple-json' })
  images: string[] = [];

  @Column({ type: 'varchar', length: 500, nullable: true })
  brochureUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  videoUrl: string | null;

  // ── Status flags ──────────────────────────────────
  @Index()
  @Column({ default: false })
  featured: boolean;

  @Index()
  @Column({ type: 'enum', enum: VehicleStatus, default: VehicleStatus.Unsold })
  vehicleStatus: VehicleStatus;

  // ── Identification ────────────────────────────────
  @Column({ type: 'varchar', length: 40, nullable: true })
  stockNumber: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 17, nullable: true })
  vinNumber: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  registration: string | null;

  // ── Specification ─────────────────────────────────
  @Column({ type: 'varchar', length: 80, nullable: true })
  trim: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  condition: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  engineSize: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  drivetrain: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  fuelEconomy: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  exteriorColor: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  interiorColor: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  colour: string | null;

  @Column({ type: 'int', nullable: true })
  doors: number | null;

  @Column({ type: 'int', nullable: true })
  seats: number | null;

  @Column({ type: 'int', nullable: true })
  topSpeed: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  acceleration: string | null;

  @Column({ type: 'int', nullable: true })
  co2: number | null;

  @Column({ type: 'int', nullable: true })
  mpg: number | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  taxLabel: string | null;

  // ── History ───────────────────────────────────────
  @Column({ type: 'int', nullable: true })
  previousOwners: number | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  serviceHistory: string | null;

  // ── Content ───────────────────────────────────────
  @Column({ type: 'simple-json' })
  features: string[] = [];

  @Column({ type: 'simple-json' })
  reviewStamps: string[] = [];

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  vehicleOverview: string | null;

  @Column({ type: 'text', nullable: true })
  featuresAndOptions: string | null;

  @Column({ type: 'text', nullable: true })
  technicalSpecs: string | null;

  @Column({ type: 'text', nullable: true })
  generalInfo: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  vehicleLocation: string | null;
}
