import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { updateProfileSchema } from '@litecode/shared-types';
import { JwtPayload } from '../auth/auth.service';
import { GqlCurrentUser } from '../auth/decorators/gql-current-user.decorator';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwt-auth.guard';
import { ZodArgsPipe } from '../common/pipes/zod-args.pipe';
import { UpdateProfileInput } from './dto/update-profile.input';
import { ParticipantProfileModel } from './models/participant-profile.model';
import { UserModel } from './models/user.model';
import { ProfileService } from './profile.service';

@Resolver()
@UseGuards(GqlJwtAuthGuard)
export class ProfileResolver {
  constructor(private readonly profileService: ProfileService) {}

  @Query(() => UserModel, { description: 'Returns the authenticated user with their profile' })
  async me(@GqlCurrentUser() user: JwtPayload): Promise<UserModel> {
    return this.profileService.getMe(user.sub) as Promise<UserModel>;
  }

  @Mutation(() => ParticipantProfileModel, {
    description: 'Updates the authenticated participant profile (partial)',
  })
  async updateProfile(
    @GqlCurrentUser() user: JwtPayload,
    @Args('input', new ZodArgsPipe(updateProfileSchema)) input: UpdateProfileInput,
  ): Promise<ParticipantProfileModel> {
    return this.profileService.updateProfile(user.sub, input) as Promise<ParticipantProfileModel>;
  }
}
