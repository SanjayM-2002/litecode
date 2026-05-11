import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtPayload } from '../auth/auth.service';
import { GqlCurrentUser } from '../auth/decorators/gql-current-user.decorator';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwt-auth.guard';
import { MySubmissionsFilterInput } from './dto/my-submissions-filter.input';
import { SubmitSolutionInput } from './dto/submit-solution.input';
import { SubmissionModel } from './models/submission.model';
import { SubmissionsPage } from './models/submissions-page.model';
import { SubmissionService } from './submission.service';

@Resolver()
@UseGuards(GqlJwtAuthGuard)
export class SubmissionResolver {
  constructor(private readonly service: SubmissionService) {}

  @Mutation(() => SubmissionModel, {
    description:
      'Submit a solution. Validates problem is published and language is supported. Returns the created Submission immediately (status=PENDING) — poll submission(id) for the verdict.',
  })
  async submitSolution(
    @GqlCurrentUser() user: JwtPayload,
    @Args('input') input: SubmitSolutionInput,
  ): Promise<SubmissionModel> {
    return this.service.submit(user.sub, input);
  }

  @Query(() => SubmissionModel, {
    description:
      'Fetch a submission by ID. Visible to the owning user and to any admin.',
  })
  async submission(
    @GqlCurrentUser() user: JwtPayload,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<SubmissionModel> {
    return this.service.getById(id, user);
  }

  @Query(() => SubmissionsPage, {
    description: 'Authenticated user\'s own submissions, paginated.',
  })
  async mySubmissions(
    @GqlCurrentUser() user: JwtPayload,
    @Args('filter', { nullable: true, defaultValue: {} }) filter: MySubmissionsFilterInput,
  ): Promise<SubmissionsPage> {
    return this.service.listMine(user.sub, filter);
  }
}
