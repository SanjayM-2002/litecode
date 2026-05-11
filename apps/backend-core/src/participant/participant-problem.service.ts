import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaService } from '@litecode/db';
import { SolvedStatus, Verdict } from '@litecode/shared-types';
import { clampPagination } from '../common/dto/pagination.input';
import { buildMeta } from '../common/models/pagination-meta.model';
import { ProblemsFilterInput } from './dto/problems-filter.input';
import { PublicTopicsFilterInput } from './dto/topics-filter.input';
import './dto/solved-status.enum';
import { PublicProblemModel } from './models/public-problem.model';
import { PublicProblemsPage } from './models/public-problems-page.model';
import { PublicCodeTemplateModel } from './models/public-code-template.model';
import { PublicTestCaseModel } from './models/public-test-case.model';
import { SignatureModel } from '../admin/models/signature.model';
import { TopicsPage } from '../admin/models/topics-page.model';

const PUBLIC_PROBLEM_INCLUDE = {
  topics: { include: { topic: true } },
  templates: true,
  testCases: { where: { isSample: true }, orderBy: { order: 'asc' as const } },
  stats: true,
} satisfies Prisma.ProblemInclude;

type PublicProblemWithRelations = Prisma.ProblemGetPayload<{
  include: typeof PUBLIC_PROBLEM_INCLUDE;
}>;

@Injectable()
export class ParticipantProblemService {
  constructor(private readonly prisma: PrismaService) {}

  async listProblems(
    filter: ProblemsFilterInput,
    userId: string | null,
  ): Promise<PublicProblemsPage> {
    const where = this.buildWhere(filter, userId);
    const { page, limit, skip } = clampPagination(filter);

    const [problems, total] = await this.prisma.$transaction([
      this.prisma.problem.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: PUBLIC_PROBLEM_INCLUDE,
      }),
      this.prisma.problem.count({ where }),
    ]);

    const status = await this.computeSolvedMap(
      userId,
      problems.map((p) => p.id),
    );

    return {
      items: problems.map((p) => this.toPublicModel(p, status)),
      meta: buildMeta(total, page, limit),
    };
  }

  async getProblemBySlug(slug: string, userId: string | null): Promise<PublicProblemModel> {
    const problem = await this.prisma.problem.findFirst({
      where: { slug, isPublished: true },
      include: PUBLIC_PROBLEM_INCLUDE,
    });
    if (!problem) throw new NotFoundException('Problem not found');

    const status = await this.computeSolvedMap(userId, [problem.id]);
    return this.toPublicModel(problem, status);
  }

  // ---------- helpers ----------

  private buildWhere(
    filter: ProblemsFilterInput,
    userId: string | null,
  ): Prisma.ProblemWhereInput {
    const where: Prisma.ProblemWhereInput = { isPublished: true };

    if (filter.difficulty) where.difficulty = filter.difficulty;
    if (filter.search) where.title = { contains: filter.search, mode: 'insensitive' };
    if (filter.topicSlug) {
      where.topics = { some: { topic: { slug: filter.topicSlug } } };
    }
    if (filter.minRating !== undefined || filter.maxRating !== undefined) {
      where.rating = {
        ...(filter.minRating !== undefined ? { gte: filter.minRating } : {}),
        ...(filter.maxRating !== undefined ? { lte: filter.maxRating } : {}),
      };
    }

    // solved/attempted/unattempted filtering, requires an authenticated user
    if (filter.solvedStatus && userId) {
      switch (filter.solvedStatus) {
        case SolvedStatus.SOLVED:
          where.submissions = { some: { userId, verdict: Verdict.ACCEPTED } };
          break;
        case SolvedStatus.ATTEMPTED:
          where.AND = [
            { submissions: { some: { userId } } },
            { submissions: { none: { userId, verdict: Verdict.ACCEPTED } } },
          ];
          break;
        case SolvedStatus.UNATTEMPTED:
          where.submissions = { none: { userId } };
          break;
      }
    }

    return where;
  }

  /**
   * For each problem id, computes whether the user has any submission and any ACCEPTED submission.
   * Returns a map for O(1) lookup when projecting.
   */
  private async computeSolvedMap(
    userId: string | null,
    problemIds: string[],
  ): Promise<Map<string, { attempted: boolean; solved: boolean }>> {
    const map = new Map<string, { attempted: boolean; solved: boolean }>();
    if (!userId || problemIds.length === 0) return map;

    const rows = await this.prisma.submission.groupBy({
      by: ['problemId'],
      where: { userId, problemId: { in: problemIds } },
      _max: { verdict: true },
      _count: { _all: true },
    });

    for (const row of rows) {
      map.set(row.problemId, {
        attempted: row._count._all > 0,
        // _max.verdict over a string-enum yields the lexicographically max verdict.
        // We need an explicit ACCEPTED check instead — do a follow-up cheap query.
        solved: false,
      });
    }

    // Refine `solved`: cheap second query for ACCEPTED-only matches.
    const acceptedRows = await this.prisma.submission.findMany({
      where: { userId, problemId: { in: problemIds }, verdict: Verdict.ACCEPTED },
      select: { problemId: true },
      distinct: ['problemId'],
    });
    for (const { problemId } of acceptedRows) {
      const existing = map.get(problemId) ?? { attempted: true, solved: false };
      existing.solved = true;
      map.set(problemId, existing);
    }

    return map;
  }

  private toPublicModel(
    problem: PublicProblemWithRelations,
    status: Map<string, { attempted: boolean; solved: boolean }>,
  ): PublicProblemModel {
    const s = status.get(problem.id) ?? { attempted: false, solved: false };
    return {
      id: problem.id,
      title: problem.title,
      slug: problem.slug,
      description: problem.description,
      difficulty: problem.difficulty,
      rating: problem.rating,
      timeLimit_ms: problem.timeLimit_ms,
      memoryLimit_kb: problem.memoryLimit_kb,
      signature: {
        methodName: problem.methodName,
        returnType: problem.returnType,
        args: problem.args as unknown as SignatureModel['args'],
      },
      topics: problem.topics.map((pt) => pt.topic),
      templates: problem.templates.map<PublicCodeTemplateModel>((t) => ({
        id: t.id,
        language: t.language,
        starterCode: t.starterCode,
        // driverCode intentionally omitted
      })),
      sampleTestCases: problem.testCases.map<PublicTestCaseModel>((tc) => ({
        id: tc.id,
        inlineInput: tc.inlineInput,
        inlineOutput: tc.inlineOutput,
        explanation: tc.explanation,
        order: tc.order,
      })),
      solved: s.solved,
      attempted: s.attempted,
      totalSubmissions: problem.stats?.totalSubmissions ?? 0,
      acceptanceRate:
        problem.stats && problem.stats.totalSubmissions > 0
          ? problem.stats.acceptedSubmissions / problem.stats.totalSubmissions
          : 0,
      createdAt: problem.createdAt,
    };
  }

  async listTopics(filter: PublicTopicsFilterInput): Promise<TopicsPage> {
    const where: Prisma.TopicWhereInput = { isActive: true };
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { slug: { contains: filter.search, mode: 'insensitive' } },
      ];
    }
    const { page, limit, skip } = clampPagination(filter);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.topic.findMany({
        where,
        take: limit,
        skip,
        orderBy: { name: 'asc' },
      }),
      this.prisma.topic.count({ where }),
    ]);

    return {
      items,
      meta: buildMeta(total, page, limit),
    };
  }
}
