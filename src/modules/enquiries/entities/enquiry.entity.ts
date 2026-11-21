import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';

/** Values match the frontend `EnquiryType` (redux/admin/enquiries/enquiriesTypes.ts). */
export enum EnquiryType {
  TestDrive = 'test-drive',
  Vehicle = 'vehicle',
  Finance = 'finance',
  PartExchange = 'part-exchange',
  General = 'general',
}

/** Values match the frontend `EnquiryStatus`. */
export enum EnquiryStatus {
  New = 'new',
  InProgress = 'in-progress',
  Resolved = 'resolved',
  Archived = 'archived',
}

/**
 * A lead submitted from the public site: test-drive booking (Contact page),
 * part-exchange valuation, finance quote, or general enquiry.
 */
@Entity('enquiries')
export class Enquiry extends BaseEntity {
  @Index()
  @Column({ type: 'enum', enum: EnquiryType })
  type: EnquiryType;

  @Index()
  @Column({ type: 'enum', enum: EnquiryStatus, default: EnquiryStatus.New })
  status: EnquiryStatus;

  // ── Contact details ───────────────────────────────
  @Column({ length: 80 })
  firstName: string;

  @Column({ length: 80, default: '' })
  lastName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ length: 30 })
  phone: string;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ default: false })
  marketingOptIn: boolean;

  // ── Vehicle of interest / test drive ──────────────
  @ManyToOne(() => Vehicle, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  vehicleId: string | null;

  @Column({ type: 'date', nullable: true })
  preferredDate: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  preferredTime: string | null;

  // ── Part exchange ─────────────────────────────────
  @Column({ type: 'varchar', length: 12, nullable: true })
  pxRegistration: string | null;

  @Column({ type: 'int', nullable: true })
  pxMileage: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  pxCondition: string | null;

  // ── Finance ───────────────────────────────────────
  @Column({ type: 'int', nullable: true })
  financeAmount: number | null;

  @Column({ type: 'int', nullable: true })
  financeDeposit: number | null;

  @Column({ type: 'int', nullable: true })
  financeTermMonths: number | null;

  // ── Internal ──────────────────────────────────────
  @Column({ type: 'text', nullable: true })
  internalNotes: string | null;
}
