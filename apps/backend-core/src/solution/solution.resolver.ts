import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtPayload } from '../auth/auth.service';
import { GqlCurrentUser } from '../auth/decorators/gql-current-user.decorator';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwt-auth.guard';
import { AddSolutionReplyInput } from './dto/add-solution-reply.input';
import { CreateSolutionInput } from './dto/create-solution.input';
import { SolutionsFilterInput } from './dto/solutions-filter.input';
import { UpdateSolutionInput } from './dto/update-solution.input';
import { UpdateSolutionReplyInput } from './dto/update-solution-reply.input';
import { SolutionModel } from './models/solution.model';
import { SolutionReplyModel } from './models/solution-reply.model';
import { SolutionsPage } from './models/solutions-page.model';
import { SolutionService } from './solution.service';

@Resolver()
@UseGuards(GqlJwtAuthGuard)
export class SolutionResolver {
  constructor(private readonly service: SolutionService) {}

  @Query(() => SolutionsPage, {
    description: 'List user-posted solutions for a problem (newest first).',
  })
  async solutions(
    @Args('filter') filter: SolutionsFilterInput,
  ): Promise<SolutionsPage> {
    return this.service.listForProblem(filter);
  }

  @Query(() => SolutionModel, {
    description: 'Fetch a single solution with its replies.',
  })
  async solution(@Args('id', { type: () => ID }) id: string): Promise<SolutionModel> {
    return this.service.getById(id);
  }

  @Mutation(() => SolutionModel, {
    description: 'Post a new solution to a published problem.',
  })
  async createSolution(
    @GqlCurrentUser() user: JwtPayload,
    @Args('input') input: CreateSolutionInput,
  ): Promise<SolutionModel> {
    return this.service.create(user.sub, input);
  }

  @Mutation(() => SolutionModel, {
    description: 'Edit one of your own solutions.',
  })
  async updateSolution(
    @GqlCurrentUser() user: JwtPayload,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateSolutionInput,
  ): Promise<SolutionModel> {
    return this.service.update(user.sub, id, input);
  }

  @Mutation(() => Boolean, {
    description: 'Delete one of your own solutions.',
  })
  async deleteSolution(
    @GqlCurrentUser() user: JwtPayload,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.service.delete(user.sub, id);
  }

  @Mutation(() => SolutionReplyModel, {
    description: 'Reply to a solution.',
  })
  async addSolutionReply(
    @GqlCurrentUser() user: JwtPayload,
    @Args('input') input: AddSolutionReplyInput,
  ): Promise<SolutionReplyModel> {
    return this.service.addReply(user.sub, input);
  }

  @Mutation(() => SolutionReplyModel, {
    description: 'Edit one of your own replies.',
  })
  async updateSolutionReply(
    @GqlCurrentUser() user: JwtPayload,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateSolutionReplyInput,
  ): Promise<SolutionReplyModel> {
    return this.service.updateReply(user.sub, id, input);
  }

  @Mutation(() => Boolean, {
    description: 'Delete one of your own replies.',
  })
  async deleteSolutionReply(
    @GqlCurrentUser() user: JwtPayload,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.service.deleteReply(user.sub, id);
  }
}
