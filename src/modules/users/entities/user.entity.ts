import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserRole, UserStatus } from '../../../common/enums/user-role.enum';

@Entity('users')
export class User extends BaseEntity {
  @Column({ length: 120 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  email: string;

  /** Never returned by default queries — select explicitly with `addSelect`. */
  @Column({ select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.Staff })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.Active })
  status: UserStatus;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;
}
