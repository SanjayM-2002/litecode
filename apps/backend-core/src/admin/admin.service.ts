import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminProfile,
  Language,
  Prisma,
  PrismaService,
  User,
} from '@litecode/db';
import { z } from 'zod';
import { AdminMeModel } from './models/admin-me.model';
import { GeneratedTemplateModel } from './models/generated-template.model';
import { ProblemModel } from './models/problem.model';
import { CodeTemplateModel } from './models/code-template.model';
import { TestCaseModel } from './models/test-case.model';
import { SignatureInput } from './dto/signature.input';
import { CreateProblemInput } from './dto/create-problem.input';
import { UpdateProblemInput } from './dto/update-problem.input';
import { TemplateInput } from './dto/template.input';
import { TestCaseInput, UpdateTestCaseInput } from './dto/test-case.input';
import { AdminProblemsFilterInput } from './dto/admin-problems-filter.input';
import { TopicsFilterInput } from './dto/topics-filter.input';
import { TopicModel } from './models/topic.model';
import { generateTemplate } from './template-generator';

const PROBLEM_INCLUDE = {
  topics: { include: { topic: true } },
  templates: true,
  testCases: { orderBy: { order: 'asc' as const } },
} satisfies Prisma.ProblemInclude;

const signatureShapeSchema = z.object({
  methodName: z.string().min(1),
  args: z.array(
    z.object({
      name: z.string().min(1),
      type: z.string().min(1),
    }),
  ),
  returnType: z.string().min(1),
});

type ProblemWithRelations = Prisma.ProblemGetPayload<{
  include: typeof PROBLEM_INCLUDE;
}>;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyAdminProfile(userId: string): Promise<AdminMeModel> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { adminProfile: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.adminProfile) throw new NotFoundException('Admin profile not found');

    const { adminProfile, ...userWithoutProfile } = user;
    return {
      user: userWithoutProfile as User & { participantProfile: null },
      profile: adminProfile as AdminProfile,
    };
  }

  generateBoilerplate(language: Language, signature: SignatureInput): GeneratedTemplateModel {
    try {
      const { starterCode, driverCode } = generateTemplate(language, {
        methodName: signature.methodName,
        args: signature.args.map((a) => ({ name: a.name, type: a.type })),
        returnType: signature.returnType,
      });
      return { language, starterCode, driverCode };
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }

  async createProblem(adminId: string, input: CreateProblemInput): Promise<ProblemModel> {
    return this.prisma.$transaction(async (tx) => {
      const topics = await this.resolveTopics(tx, input.topicIds);

      const problem = await tx.problem
        .create({
          data: {
            title: input.title,
            slug: input.slug,
            description: input.description,
            difficulty: input.difficulty,
            rating: input.rating ?? undefined, // let DB default (1500) apply if omitted
            signature: this.signatureToJson(input.signature),
            isPublished: false,
            createdById: adminId,
            topics: {
              create: topics.map((t) => ({ topicId: t.id })),
            },
            templates: input.templates?.length
              ? {
                  create: input.templates.map((t) => ({
                    language: t.language,
                    starterCode: t.starterCode,
                    driverCode: t.driverCode,
                  })),
                }
              : undefined,
          },
          include: PROBLEM_INCLUDE,
        })
        .catch((err) => {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002'
          ) {
            throw new ConflictException('A problem with this slug already exists');
          }
          throw err;
        });

      return this.toProblemModel(problem);
    });
  }

  async updateProblem(id: string, input: UpdateProblemInput): Promise<ProblemModel> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.problem.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Problem not found');

      if (input.topicIds !== undefined) {
        const topics = await this.resolveTopics(tx, input.topicIds);
        await tx.problemTopic.deleteMany({ where: { problemId: id } });
        if (topics.length > 0) {
          await tx.problemTopic.createMany({
            data: topics.map((t) => ({ problemId: id, topicId: t.id })),
          });
        }
      }

      const data: Prisma.ProblemUpdateInput = {};
      if (input.title !== undefined) data.title = input.title;
      if (input.slug !== undefined) data.slug = input.slug;
      if (input.description !== undefined) data.description = input.description;
      if (input.difficulty !== undefined) data.difficulty = input.difficulty;
      if (input.rating !== undefined) data.rating = input.rating;
      if (input.signature !== undefined) data.signature = this.signatureToJson(input.signature);

      const updated = await tx.problem
        .update({ where: { id }, data, include: PROBLEM_INCLUDE })
        .catch((err) => {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002'
          ) {
            throw new ConflictException('A problem with this slug already exists');
          }
          throw err;
        });

      return this.toProblemModel(updated);
    });
  }

  async setCodeTemplate(problemId: string, input: TemplateInput): Promise<CodeTemplateModel> {
    const problem = await this.prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem) throw new NotFoundException('Problem not found');

    return this.prisma.codeTemplate.upsert({
      where: { problemId_language: { problemId, language: input.language } },
      create: {
        problemId,
        language: input.language,
        starterCode: input.starterCode,
        driverCode: input.driverCode,
      },
      update: {
        starterCode: input.starterCode,
        driverCode: input.driverCode,
      },
    });
  }

  async getAdminProblems(filter: AdminProblemsFilterInput): Promise<ProblemModel[]> {
    const where: Prisma.ProblemWhereInput = {};
    if (filter.difficulty) where.difficulty = filter.difficulty;
    if (filter.isPublished !== undefined) where.isPublished = filter.isPublished;
    if (filter.search) where.title = { contains: filter.search, mode: 'insensitive' };
    if (filter.topicSlug) {
      where.topics = { some: { topic: { slug: filter.topicSlug } } };
    }
    if (filter.createdById) where.createdById = filter.createdById;
    if (filter.minRating !== undefined || filter.maxRating !== undefined) {
      where.rating = {
        ...(filter.minRating !== undefined ? { gte: filter.minRating } : {}),
        ...(filter.maxRating !== undefined ? { lte: filter.maxRating } : {}),
      };
    }

    const problems = await this.prisma.problem.findMany({
      where,
      take: filter.take ?? 50,
      skip: filter.skip ?? 0,
      orderBy: { createdAt: 'desc' },
      include: PROBLEM_INCLUDE,
    });

    return problems.map((p) => this.toProblemModel(p));
  }

  async getProblemForAdmin(id: string): Promise<ProblemModel> {
    const problem = await this.prisma.problem.findUnique({
      where: { id },
      include: PROBLEM_INCLUDE,
    });
    if (!problem) throw new NotFoundException('Problem not found');
    return this.toProblemModel(problem);
  }

  async getTopics(filter: TopicsFilterInput): Promise<TopicModel[]> {
    const where: Prisma.TopicWhereInput = {};
    if (filter.isActive !== undefined && filter.isActive !== null) {
      where.isActive = filter.isActive;
    }
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { slug: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.topic.findMany({
      where,
      take: filter.take ?? 50,
      skip: filter.skip ?? 0,
      orderBy: { name: 'asc' },
    });
  }

  private async resolveTopics(
    tx: Prisma.TransactionClient,
    ids: string[],
  ): Promise<{ id: string }[]> {
    if (ids.length === 0) return [];
    const found = await tx.topic.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (found.length !== ids.length) {
      const knownIds = new Set(found.map((t) => t.id));
      const missing = ids.filter((id) => !knownIds.has(id));
      throw new BadRequestException(`Unknown topic ids: ${missing.join(', ')}`);
    }
    return found;
  }

  private signatureToJson(sig: SignatureInput): Prisma.InputJsonValue {
    return {
      methodName: sig.methodName,
      args: sig.args.map((a) => ({ name: a.name, type: a.type })),
      returnType: sig.returnType,
    };
  }

  private toProblemModel(problem: ProblemWithRelations): ProblemModel {
    return {
      id: problem.id,
      title: problem.title,
      slug: problem.slug,
      description: problem.description,
      difficulty: problem.difficulty,
      rating: problem.rating,
      isPublished: problem.isPublished,
      signature: problem.signature as unknown as ProblemModel['signature'],
      topics: problem.topics.map((pt) => pt.topic),
      templates: problem.templates,
      testCases: problem.testCases as unknown as TestCaseModel[],
      createdById: problem.createdById,
      createdAt: problem.createdAt,
      updatedAt: problem.updatedAt,
    };
  }

  // --- Test cases ---

  async addTestCases(problemId: string, inputs: TestCaseInput[]): Promise<TestCaseModel[]> {
    if (inputs.length === 0) {
      throw new BadRequestException('inputs cannot be empty');
    }

    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      select: { id: true },
    });
    if (!problem) throw new NotFoundException('Problem not found');

    const { _max } = await this.prisma.testCase.aggregate({
      where: { problemId },
      _max: { order: true },
    });
    const baseOrder = (_max.order ?? -1) + 1;

    const rows = await this.prisma.testCase.createManyAndReturn({
      data: inputs.map((input, i) => ({
        problemId,
        inlineInput: input.inlineInput as Prisma.InputJsonValue,
        inlineOutput: input.inlineOutput as Prisma.InputJsonValue,
        isSample: input.isSample,
        explanation: input.explanation ?? null,
        order: baseOrder + i,
      })),
    });

    return rows as unknown as TestCaseModel[];
  }

  async updateTestCase(id: string, input: UpdateTestCaseInput): Promise<TestCaseModel> {
    const data: Prisma.TestCaseUpdateInput = {};
    if (input.inlineInput !== undefined) {
      data.inlineInput = input.inlineInput as Prisma.InputJsonValue;
    }
    if (input.inlineOutput !== undefined) {
      data.inlineOutput = input.inlineOutput as Prisma.InputJsonValue;
    }
    if (input.isSample !== undefined) data.isSample = input.isSample;
    if (input.explanation !== undefined) data.explanation = input.explanation;
    if (input.order !== undefined) data.order = input.order;

    const updated = await this.prisma.testCase
      .update({ where: { id }, data })
      .catch((err) => {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
          throw new NotFoundException('Test case not found');
        }
        throw err;
      });

    return updated as unknown as TestCaseModel;
  }

  async deleteTestCase(id: string): Promise<boolean> {
    await this.prisma.testCase.delete({ where: { id } }).catch((err) => {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Test case not found');
      }
      throw err;
    });
    return true;
  }

  // --- Publish gate ---

  async publishProblem(id: string): Promise<ProblemModel> {
    const problem = await this.prisma.problem.findUnique({
      where: { id },
      include: PROBLEM_INCLUDE,
    });
    if (!problem) throw new NotFoundException('Problem not found');

    const errors = this.validateForPublish(problem);
    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Cannot publish problem',
        errors,
      });
    }

    const updated = await this.prisma.problem.update({
      where: { id },
      data: { isPublished: true },
      include: PROBLEM_INCLUDE,
    });

    return this.toProblemModel(updated);
  }

  async unpublishProblem(id: string): Promise<ProblemModel> {
    const updated = await this.prisma.problem
      .update({
        where: { id },
        data: { isPublished: false },
        include: PROBLEM_INCLUDE,
      })
      .catch((err) => {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
          throw new NotFoundException('Problem not found');
        }
        throw err;
      });

    return this.toProblemModel(updated);
  }

  private validateForPublish(problem: ProblemWithRelations): string[] {
    const errors: string[] = [];

    if (problem.topics.length === 0) {
      errors.push('Problem must have at least one topic');
    }

    if (problem.templates.length === 0) {
      errors.push('Problem must have at least one code template');
    }

    const samples = problem.testCases.filter((tc) => tc.isSample);
    const hidden = problem.testCases.filter((tc) => !tc.isSample);
    if (samples.length === 0) {
      errors.push('Problem must have at least one sample test case (isSample: true)');
    }
    if (hidden.length === 0) {
      errors.push('Problem must have at least one hidden test case (isSample: false)');
    }

    const sigParse = signatureShapeSchema.safeParse(problem.signature);
    if (!sigParse.success) {
      const flat = sigParse.error.flatten();
      const formFieldIssues = Object.entries(flat.fieldErrors)
        .flatMap(([k, v]) => (v ?? []).map((m) => `signature.${k}: ${m}`));
      const formIssues = flat.formErrors.map((m) => `signature: ${m}`);
      errors.push(...formIssues, ...formFieldIssues);
    }

    return errors;
  }
}
