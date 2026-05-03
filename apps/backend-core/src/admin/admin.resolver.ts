import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Permission } from '@litecode/db';
import { JwtPayload } from '../auth/auth.service';
import { GqlCurrentUser } from '../auth/decorators/gql-current-user.decorator';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwt-auth.guard';
import { AdminService } from './admin.service';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import { AdminProblemsFilterInput } from './dto/admin-problems-filter.input';
import { CreateProblemInput } from './dto/create-problem.input';
import { GenerateTemplateInput } from './dto/generate-template.input';
import { TemplateInput } from './dto/template.input';
import { TestCaseInput, UpdateTestCaseInput } from './dto/test-case.input';
import { TopicsFilterInput } from './dto/topics-filter.input';
import { UpdateProblemInput } from './dto/update-problem.input';
import { AdminPermissionsGuard } from './guards/admin-permissions.guard';
import { AdminMeModel } from './models/admin-me.model';
import { CodeTemplateModel } from './models/code-template.model';
import { GeneratedTemplateModel } from './models/generated-template.model';
import { ProblemModel } from './models/problem.model';
import { TestCaseModel } from './models/test-case.model';
import { TopicModel } from './models/topic.model';

@Resolver()
@UseGuards(GqlJwtAuthGuard, AdminPermissionsGuard)
export class AdminResolver {
  constructor(private readonly adminService: AdminService) {}

  // --- Profile / helpers ---

  @Query(() => AdminMeModel, {
    description: 'Returns the authenticated admin user with their AdminProfile (admin-only)',
  })
  async myAdminProfile(@GqlCurrentUser() user: JwtPayload): Promise<AdminMeModel> {
    return this.adminService.getMyAdminProfile(user.sub);
  }

  @Query(() => GeneratedTemplateModel, {
    description: 'Generate suggested starterCode + driverCode for a given (signature, language).',
  })
  @RequirePermissions(Permission.CREATE_PROBLEM)
  async generateTemplate(
    @Args('input') input: GenerateTemplateInput,
  ): Promise<GeneratedTemplateModel> {
    return this.adminService.generateBoilerplate(input.language, input.signature);
  }

  @Query(() => [TopicModel], {
    description: 'List topics with optional search and pagination (admin view).',
  })
  async topics(
    @Args('filter', { nullable: true, defaultValue: {} }) filter: TopicsFilterInput,
  ): Promise<TopicModel[]> {
    return this.adminService.getTopics(filter);
  }

  // --- Problem queries ---

  @Query(() => [ProblemModel], {
    description: 'List problems including drafts (admin view).',
  })
  @RequirePermissions(Permission.EDIT_PROBLEM)
  async adminProblems(
    @Args('filter', { nullable: true, defaultValue: {} }) filter: AdminProblemsFilterInput,
  ): Promise<ProblemModel[]> {
    return this.adminService.getAdminProblems(filter);
  }

  @Query(() => ProblemModel, {
    description: 'Full nested problem view for admin (includes drafts and templates).',
  })
  @RequirePermissions(Permission.EDIT_PROBLEM)
  async problemForAdmin(@Args('id', { type: () => ID }) id: string): Promise<ProblemModel> {
    return this.adminService.getProblemForAdmin(id);
  }

  // --- Problem mutations ---

  @Mutation(() => ProblemModel, {
    description: 'Create a draft problem with topics and (optionally) code templates.',
  })
  @RequirePermissions(Permission.CREATE_PROBLEM)
  async createProblem(
    @GqlCurrentUser() user: JwtPayload,
    @Args('input') input: CreateProblemInput,
  ): Promise<ProblemModel> {
    return this.adminService.createProblem(user.sub, input);
  }

  @Mutation(() => ProblemModel, {
    description: 'Patch problem metadata. topicSlugs replaces all topic links if provided.',
  })
  @RequirePermissions(Permission.EDIT_PROBLEM)
  async updateProblem(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateProblemInput,
  ): Promise<ProblemModel> {
    return this.adminService.updateProblem(id, input);
  }

  @Mutation(() => CodeTemplateModel, {
    description: 'Upsert a (problem, language) code template. Use the same call to create or update.',
  })
  @RequirePermissions(Permission.MANAGE_TEMPLATES)
  async setCodeTemplate(
    @Args('problemId', { type: () => ID }) problemId: string,
    @Args('input') input: TemplateInput,
  ): Promise<CodeTemplateModel> {
    return this.adminService.setCodeTemplate(problemId, input);
  }

  // --- Test cases ---

  @Mutation(() => [TestCaseModel], {
    description: 'Bulk-add inline test cases. order is server-assigned by array index.',
  })
  @RequirePermissions(Permission.EDIT_PROBLEM)
  async addTestCases(
    @Args('problemId', { type: () => ID }) problemId: string,
    @Args({ name: 'inputs', type: () => [TestCaseInput] }) inputs: TestCaseInput[],
  ): Promise<TestCaseModel[]> {
    return this.adminService.addTestCases(problemId, inputs);
  }

  @Mutation(() => TestCaseModel, { description: 'Patch a single test case.' })
  @RequirePermissions(Permission.EDIT_PROBLEM)
  async updateTestCase(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateTestCaseInput,
  ): Promise<TestCaseModel> {
    return this.adminService.updateTestCase(id, input);
  }

  @Mutation(() => Boolean, { description: 'Delete a test case.' })
  @RequirePermissions(Permission.EDIT_PROBLEM)
  async deleteTestCase(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.adminService.deleteTestCase(id);
  }

  // --- Publish gate ---

  @Mutation(() => ProblemModel, {
    description:
      'Validate completeness (topics, templates, sample + hidden test cases, signature shape) and flip isPublished=true.',
  })
  @RequirePermissions(Permission.EDIT_PROBLEM)
  async publishProblem(@Args('id', { type: () => ID }) id: string): Promise<ProblemModel> {
    return this.adminService.publishProblem(id);
  }

  @Mutation(() => ProblemModel, {
    description: 'Hide a published problem from participants (isPublished=false). No validation.',
  })
  @RequirePermissions(Permission.EDIT_PROBLEM)
  async unpublishProblem(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ProblemModel> {
    return this.adminService.unpublishProblem(id);
  }
}
