import type { Role } from './role';

export interface IPublicUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: Date;
}

export interface IAuthResponse {
  accessToken: string;
  user: IPublicUser;
}
