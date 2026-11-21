import { UserRole } from '../enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

/** The authenticated user attached to `request.user` by the JWT strategy. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
