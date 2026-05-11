import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { JwtPayload } from '../auth/auth.service';
import { GqlCurrentUser } from '../auth/decorators/gql-current-user.decorator';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwt-auth.guard';
import { GqlPremiumGuard } from '../entitlement/guards/gql-premium.guard';
import { AiService } from './ai.service';
import { AiHintInput } from './dto/ai-hint.input';
import { AiHelpInput } from './dto/ai-help.input';
import { AiRoastInput } from './dto/ai-roast.input';
import { AiResponseModel } from './models/ai-response.model';

@Resolver()
@UseGuards(GqlJwtAuthGuard, GqlPremiumGuard)
export class AiResolver {
  constructor(private readonly service: AiService) {}

  @Mutation(() => AiResponseModel, {
    description: 'Get a hint for a problem. Premium only.',
  })
  async aiHint(@Args('input') input: AiHintInput): Promise<AiResponseModel> {
    return this.service.hint(input);
  }

  @Mutation(() => AiResponseModel, {
    description: 'Get conceptual help for the user\'s in-progress code. Premium only.',
  })
  async aiHelp(@Args('input') input: AiHelpInput): Promise<AiResponseModel> {
    return this.service.help(input);
  }

  @Mutation(() => AiResponseModel, {
    description: 'Roast the caller\'s own submission. Premium only.',
  })
  async aiRoast(
    @GqlCurrentUser() user: JwtPayload,
    @Args('input') input: AiRoastInput,
  ): Promise<AiResponseModel> {
    return this.service.roast(user.sub, input);
  }
}
