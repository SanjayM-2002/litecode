import { Injectable, NotFoundException } from '@nestjs/common';
import { ParticipantProfile, Prisma, PrismaService, User } from '@litecode/db';
import { UpdateProfileSchema } from '@litecode/shared-types';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string): Promise<User & { participantProfile: ParticipantProfile | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { participantProfile: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileSchema,
  ): Promise<ParticipantProfile> {
    const data: Prisma.ParticipantProfileUpdateInput = {};
    if (input.gender !== undefined) data.gender = input.gender;
    if (input.birthday !== undefined) data.birthday = input.birthday;
    if (input.bio !== undefined) data.bio = input.bio;
    if (input.country !== undefined) data.country = input.country;
    if (input.state !== undefined) data.state = input.state;
    if (input.city !== undefined) data.city = input.city;
    if (input.skills !== undefined) data.skills = { set: input.skills };

    return this.prisma.participantProfile.update({
      where: { userId },
      data,
    });
  }
}
