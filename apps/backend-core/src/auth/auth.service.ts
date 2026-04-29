import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService, Role, User } from '@litecode/db';
import * as bcrypt from 'bcrypt';
import {
  IAuthResponse,
  IPublicUser,
  LoginSchema,
  SignupSchema,
} from '@litecode/shared-types';

const BCRYPT_COST = 12;

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async signup(input: SignupSchema): Promise<IAuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: input.email,
          password: passwordHash,
          name: input.name,
          role: Role.PARTICIPANT,
        },
      });
      await tx.participantProfile.create({ data: { userId: created.id } });
      return created;
    });

    return this.buildAuthResponse(user);
  }

  async login(input: LoginSchema): Promise<IAuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    const passwordMatches = user?.password
      ? await bcrypt.compare(input.password, user.password)
      : false;

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: User): IAuthResponse {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken, user: this.toPublicUser(user) };
  }

  private toPublicUser(user: User): IPublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
