import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Brackets, Repository } from 'typeorm';
import { skipOf } from '../../common/dto/pagination-query.dto';
import { UserRole, UserStatus } from '../../common/enums/user-role.enum';
import { paginate } from '../../common/interfaces/paginated-result.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  hashPassword(plain: string) {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  async findAll(query: QueryUsersDto) {
    const qb = this.users.createQueryBuilder('u').orderBy('u.createdAt', 'DESC');

    if (query.search) {
      const term = `%${query.search.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((w) =>
          w.where('LOWER(u.name) LIKE :term', { term }).orWhere('u.email LIKE :term', { term }),
        ),
      );
    }
    if (query.role) qb.andWhere('u.role = :role', { role: query.role });
    if (query.status) qb.andWhere('u.status = :status', { status: query.status });

    const [data, total] = await qb.skip(skipOf(query)).take(query.limit).getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }

  async findOne(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Used by auth — includes the password hash. */
  findByEmailWithPassword(email: string) {
    return this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: email.trim().toLowerCase() })
      .getOne();
  }

  findByIdWithPassword(id: string) {
    return this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id })
      .getOne();
  }

  async create(dto: CreateUserDto) {
    await this.assertEmailFree(dto.email);

    const temporaryPassword = dto.password ? undefined : randomBytes(9).toString('base64url');
    const user = this.users.create({
      name: dto.name,
      email: dto.email,
      role: dto.role,
      status: dto.status ?? UserStatus.Active,
      passwordHash: await this.hashPassword(dto.password ?? temporaryPassword!),
    });
    const saved = await this.users.save(user);
    const { passwordHash: _omit, ...safe } = saved;
    return { ...safe, ...(temporaryPassword && { temporaryPassword }) };
  }

  async update(id: string, dto: UpdateUserDto, actingUserId: string) {
    const user = await this.findOne(id);

    if (dto.email && dto.email !== user.email) await this.assertEmailFree(dto.email);

    if (id === actingUserId) {
      if (dto.status === UserStatus.Inactive) {
        throw new BadRequestException('You cannot deactivate your own account');
      }
      if (dto.role && dto.role !== user.role) {
        throw new BadRequestException('You cannot change your own role');
      }
    }
    if (user.role === UserRole.Admin && dto.role && dto.role !== UserRole.Admin) {
      await this.assertNotLastAdmin(id);
    }

    const { password, ...rest } = dto;
    Object.assign(user, rest);
    if (password) user.passwordHash = await this.hashPassword(password);

    await this.users.save(user);
    return this.findOne(id);
  }

  async remove(id: string, actingUserId: string) {
    if (id === actingUserId) throw new BadRequestException('You cannot delete your own account');
    const user = await this.findOne(id);
    if (user.role === UserRole.Admin) await this.assertNotLastAdmin(id);
    await this.users.remove(user);
  }

  async setPassword(id: string, plain: string) {
    await this.users.update(id, { passwordHash: await this.hashPassword(plain) });
  }

  touchLastLogin(id: string) {
    return this.users.update(id, { lastLoginAt: new Date() });
  }

  countActive() {
    return this.users.count({ where: { status: UserStatus.Active } });
  }

  count() {
    return this.users.count();
  }

  private async assertEmailFree(email: string) {
    if (await this.users.exists({ where: { email } })) {
      throw new ConflictException('A user with this email already exists');
    }
  }

  private async assertNotLastAdmin(excludingId: string) {
    const admins = await this.users.count({ where: { role: UserRole.Admin } });
    const isAdmin = await this.users.exists({ where: { id: excludingId, role: UserRole.Admin } });
    if (isAdmin && admins <= 1) {
      throw new BadRequestException('At least one admin account must remain');
    }
  }
}
