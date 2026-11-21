import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { skipOf } from '../../common/dto/pagination-query.dto';
import { paginate } from '../../common/interfaces/paginated-result.interface';
import { Vehicle, VehicleStatus } from '../vehicles/entities/vehicle.entity';
import { QueryEnquiriesDto, UpdateEnquiryDto } from './dto/admin-enquiry.dto';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { Enquiry, EnquiryStatus, EnquiryType } from './entities/enquiry.entity';

@Injectable()
export class EnquiriesService {
  constructor(
    @InjectRepository(Enquiry) private readonly enquiries: Repository<Enquiry>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
  ) {}

  async create(dto: CreateEnquiryDto) {
    if (dto.vehicleId) {
      const vehicle = await this.vehicles.findOne({ where: { id: dto.vehicleId } });
      if (!vehicle) throw new BadRequestException('Selected vehicle does not exist');
      if (dto.type === EnquiryType.TestDrive && vehicle.vehicleStatus === VehicleStatus.Sold) {
        throw new BadRequestException('This vehicle has been sold');
      }
    }
    if (dto.type === EnquiryType.TestDrive && dto.preferredDate) {
      const today = new Date().toISOString().slice(0, 10);
      if (dto.preferredDate < today) {
        throw new BadRequestException('preferredDate cannot be in the past');
      }
    }

    const saved = await this.enquiries.save(
      this.enquiries.create({ ...dto, lastName: dto.lastName ?? '' }),
    );
    // Public response: just enough for a confirmation message.
    return { id: saved.id, type: saved.type, createdAt: saved.createdAt };
  }

  async findAll(q: QueryEnquiriesDto) {
    const qb = this.enquiries
      .createQueryBuilder('e')
      .leftJoin('e.vehicle', 'v')
      .addSelect(['v.id', 'v.make', 'v.model', 'v.variant', 'v.image'])
      .orderBy('e.createdAt', 'DESC');

    if (q.type) qb.andWhere('e.type = :type', { type: q.type });
    if (q.status) qb.andWhere('e.status = :status', { status: q.status });
    if (q.search) {
      const term = `%${q.search.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((w) =>
          w
            .where(`LOWER(e.firstName || ' ' || e.lastName) LIKE :term`, { term })
            .orWhere('LOWER(e.email) LIKE :term', { term })
            .orWhere('e.phone LIKE :term', { term }),
        ),
      );
    }

    const [data, total] = await qb.skip(skipOf(q)).take(q.limit).getManyAndCount();
    return paginate(data, total, q.page, q.limit);
  }

  async findOne(id: string) {
    const enquiry = await this.enquiries.findOne({ where: { id }, relations: { vehicle: true } });
    if (!enquiry) throw new NotFoundException('Enquiry not found');
    return enquiry;
  }

  async update(id: string, dto: UpdateEnquiryDto) {
    const enquiry = await this.findOne(id);
    Object.assign(enquiry, dto);
    return this.enquiries.save(enquiry);
  }

  async remove(id: string) {
    const enquiry = await this.findOne(id);
    await this.enquiries.remove(enquiry);
  }

  async stats() {
    const rows = await this.enquiries
      .createQueryBuilder('e')
      .select('e.type', 'type')
      .addSelect('COUNT(*)::int', 'total')
      .addSelect(`COUNT(*) FILTER (WHERE e.status = '${EnquiryStatus.New}')::int`, 'new')
      .groupBy('e.type')
      .getRawMany<{ type: EnquiryType; total: number; new: number }>();

    return {
      total: rows.reduce((s, r) => s + r.total, 0),
      new: rows.reduce((s, r) => s + r.new, 0),
      byType: rows,
    };
  }
}
