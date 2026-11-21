import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserStatus } from '../../common/enums/user-role.enum';
import { AuthUser, JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login({ email, password }: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(email);
    // Same message for unknown email and wrong password — don't leak which.
    const valid = user && (await bcrypt.compare(password, user.passwordHash));
    if (!user || !valid) throw new UnauthorizedException('Invalid email or password');
    if (user.status !== UserStatus.Active) {
      throw new UnauthorizedException('This account has been deactivated');
    }

    await this.usersService.touchLastLogin(user.id);

    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const authUser: AuthUser = { id: user.id, email: user.email, name: user.name, role: user.role };
    return { accessToken: await this.jwtService.signAsync(payload), user: authUser };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersService.findByIdWithPassword(userId);
    if (!user || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Current password is incorrect');
    }
    await this.usersService.setPassword(userId, dto.newPassword);
  }
}
