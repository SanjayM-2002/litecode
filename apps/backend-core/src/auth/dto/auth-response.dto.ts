import { ApiProperty } from '@nestjs/swagger';
import { IAuthResponse, IPublicUser, roleSchema, type Role } from '@litecode/shared-types';

export class PublicUserDto implements IPublicUser {
  @ApiProperty({ description: 'Unique user identifier (cuid)', type: String })
  id: string;

  @ApiProperty({ description: 'Account email (lowercased, unique)', type: String })
  email: string;

  @ApiProperty({ description: 'Display name', type: String, nullable: true })
  name: string | null;

  @ApiProperty({ description: 'User role', enum: roleSchema.options, enumName: 'Role' })
  role: Role;

  @ApiProperty({ description: 'Account creation timestamp', type: String, format: 'date-time' })
  createdAt: Date;
}

export class AuthResponseDto implements IAuthResponse {
  @ApiProperty({ description: 'JWT bearer token to send as Authorization: Bearer <token>', type: String })
  accessToken: string;

  @ApiProperty({ description: 'The authenticated user', type: PublicUserDto })
  user: PublicUserDto;
}
