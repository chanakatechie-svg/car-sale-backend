import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserStatus } from '../../../common/enums/user-role.enum';
import { AuthUser, JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
    });
  }

  /**
   * Re-loads the user on every request so deactivated users and role changes
   * take effect immediately rather than when the token expires.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.usersService.findOne(payload.sub).catch(() => null);
    if (!user || user.status !== UserStatus.Active) {
      throw new UnauthorizedException('Account is no longer active');
    }
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
