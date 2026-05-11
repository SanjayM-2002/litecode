import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { JwtPayload } from '../auth/auth.service';
import { GqlCurrentUser } from '../auth/decorators/gql-current-user.decorator';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwt-auth.guard';
import { ProblemsFilterInput } from './dto/problems-filter.input';
import { PublicTopicsFilterInput } from './dto/topics-filter.input';
import { PublicProblemModel } from './models/public-problem.model';
import { PublicProblemsPage } from './models/public-problems-page.model';
import { ParticipantProblemService } from './participant-problem.service';
import { TopicsPage } from '../admin/models/topics-page.model';

@Resolver()
@UseGuards(GqlJwtAuthGuard)
export class ParticipantProblemResolver {
  constructor(private readonly service: ParticipantProblemService) {}

  @Query(() => PublicProblemsPage, {
    description:
      'List published problems with optional filters and pagination. Includes solved/attempted indicators for the authenticated user.',
  })
  async problems(
    @GqlCurrentUser() user: JwtPayload,
    @Args('filter', { nullable: true, defaultValue: {} }) filter: ProblemsFilterInput,
  ): Promise<PublicProblemsPage> {
    return this.service.listProblems(filter, user.sub);
  }

  @Query(() => PublicProblemModel, {
    description:
      'Get a single published problem by slug. Returns sample test cases, code templates without driver code, and solved/attempted state.',
  })
  async problem(
    @GqlCurrentUser() user: JwtPayload,
    @Args('slug') slug: string,
  ): Promise<PublicProblemModel> {
    return this.service.getProblemBySlug(slug, user.sub);
  }

  @Query(() => TopicsPage, {
    description: 'List active topics, suitable for the public topic-browser page.',
  })
  async topics(
    @Args('filter', { nullable: true, defaultValue: {} }) filter: PublicTopicsFilterInput,
  ): Promise<TopicsPage> {
    return this.service.listTopics(filter);
  }
}
