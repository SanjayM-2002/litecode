import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CacheService, cacheKeys } from '@litecode/cache';
import { Prisma, PrismaService } from '@litecode/db';
import { SolvedStatus, UserTier, Verdict } from '@litecode/shared-types';
import { clampPagination } from '../common/dto/pagination.input';
import { buildMeta, PaginationMeta } from '../common/models/pagination-meta.model';
import { EntitlementService } from '../entitlement/entitlement.service';
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


type CachedProblem = Omit<PublicProblemModel, 'solved' | 'attempted'>;
type CachedProblemsPage = { items: CachedProblem[]; meta: PaginationMeta };
type SolvedMap = Record<string, { solved: boolean; attempted: boolean }>;

const TTL_PROBLEMS_LIST_SEC = 600; // 10 min
const TTL_PROBLEM_DETAIL_SEC = 1800; // 30 min
const TTL_TOPICS_LIST_SEC = 1800; // 30 min
const TTL_USER_SOLVED_MAP_SEC = 300; // 5 min

@Injectable()
export class ParticipantProblemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly entitlement: EntitlementService,
  ) {}

  private async resolveViewerTier(userId: string | null): Promise<UserTier> {
    if (!userId) return UserTier.FREE;
    return this.entitlement.getTier(userId);
  }

  async listProblems(
    filter: ProblemsFilterInput,
    userId: string | null,
  ): Promise<PublicProblemsPage> {
    const { page, limit } = clampPagination(filter);
    const viewerTier = await this.resolveViewerTier(userId);

    // Cache only the bounded, global slice of the filter space. Variant axes:
    // tier (2) × difficulty (≤4) × page × limit. Search/rating/topicSlug are
    // unbounded; solvedStatus changes the SQL itself so it can't be a shared
    // key.
    const cacheable =
      !filter.search &&
      filter.minRating === undefined &&
      filter.maxRating === undefined &&
      !filter.topicSlug &&
      !filter.solvedStatus;

    let base: CachedProblemsPage;
    if (cacheable) {
      const key = cacheKeys.problemsList({
        tier: viewerTier,
        difficulty: filter.difficulty ?? null,
        page,
        limit,
      });
      base = await this.cache.getOrSet<CachedProblemsPage>(
        key,
        TTL_PROBLEMS_LIST_SEC,
        () => this.queryProblemsPageFromDb(filter, page, limit, null, viewerTier),
      );
    } else {
      base = await this.queryProblemsPageFromDb(filter, page, limit, userId, viewerTier);
    }

    const items = await this.overlaySolvedForList(base.items, userId);
    return { items, meta: base.meta };
  }

  async getProblemBySlug(
    slug: string,
    userId: string | null,
  ): Promise<PublicProblemModel> {
    const cached = await this.cache.getOrSet<CachedProblem>(
      cacheKeys.problemBySlug(slug),
      TTL_PROBLEM_DETAIL_SEC,
      () => this.queryProblemBySlugFromDb(slug),
    );
    const base = this.reviveCachedProblem(cached);

    if (base.tier === UserTier.PREMIUM) {
      const viewerTier = await this.resolveViewerTier(userId);
      if (viewerTier !== UserTier.PREMIUM) {
        throw new ForbiddenException('PROBLEM_REQUIRES_PREMIUM');
      }
    }

    const solvedMap = await this.getSolvedMap(userId);
    const status = solvedMap[base.id];
    return {
      ...base,
      solved: status?.solved ?? false,
      attempted: status?.attempted ?? false,
    };
  }

  async listTopics(filter: PublicTopicsFilterInput): Promise<TopicsPage> {
    const { page, limit } = clampPagination(filter);

    if (filter.search) {
      return this.queryTopicsPageFromDb(filter, page, limit);
    }

    return this.cache.getOrSet<TopicsPage>(
      cacheKeys.topicsList({ page, limit }),
      TTL_TOPICS_LIST_SEC,
      () => this.queryTopicsPageFromDb(filter, page, limit),
    );
  }

  // ---------- DB loaders ----------

  private async queryProblemsPageFromDb(
    filter: ProblemsFilterInput,
    page: number,
    limit: number,
    userIdForFilter: string | null,
    viewerTier: UserTier,
  ): Promise<CachedProblemsPage> {
    const where = this.buildWhere(filter, userIdForFilter, viewerTier);
    const skip = (page - 1) * limit;

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

    return {
      items: problems.map((p) => this.toCachedProblem(p)),
      meta: buildMeta(total, page, limit),
    };
  }

  private async queryProblemBySlugFromDb(slug: string): Promise<CachedProblem> {
    const problem = await this.prisma.problem.findFirst({
      where: { slug, isPublished: true },
      include: PUBLIC_PROBLEM_INCLUDE,
    });
    if (!problem) throw new NotFoundException('Problem not found');
    return this.toCachedProblem(problem);
  }

  private async queryTopicsPageFromDb(
    filter: PublicTopicsFilterInput,
    page: number,
    limit: number,
  ): Promise<TopicsPage> {
    const where: Prisma.TopicWhereInput = { isActive: true };
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { slug: { contains: filter.search, mode: 'insensitive' } },
      ];
    }
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.topic.findMany({
        where,
        take: limit,
        skip,
        orderBy: { name: 'asc' },
      }),
      this.prisma.topic.count({ where }),
    ]);

    return { items, meta: buildMeta(total, page, limit) };
  }

  // ---------- helpers ----------

  private buildWhere(
    filter: ProblemsFilterInput,
    userId: string | null,
    viewerTier: UserTier,
  ): Prisma.ProblemWhereInput {
    const where: Prisma.ProblemWhereInput = { isPublished: true };

    // FREE viewers see only FREE problems; PREMIUM sees everything.
    if (viewerTier !== UserTier.PREMIUM) where.tier = UserTier.FREE;

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

  // Per-user solved/attempted lookup. Cached as a single map covering every
  // problem the user has touched, regardless of which page they're viewing.
  // Invalidated by the grader worker when a verdict lands.
  private async getSolvedMap(userId: string | null): Promise<SolvedMap> {
    if (!userId) return {};
    return this.cache.getOrSet<SolvedMap>(
      cacheKeys.userSolvedMap(userId),
      TTL_USER_SOLVED_MAP_SEC,
      async () => {
        const map: SolvedMap = {};

        const attempted = await this.prisma.submission.findMany({
          where: { userId },
          select: { problemId: true },
          distinct: ['problemId'],
        });
        for (const { problemId } of attempted) {
          map[problemId] = { attempted: true, solved: false };
        }

        const accepted = await this.prisma.submission.findMany({
          where: { userId, verdict: Verdict.ACCEPTED },
          select: { problemId: true },
          distinct: ['problemId'],
        });
        for (const { problemId } of accepted) {
          map[problemId] = { attempted: true, solved: true };
        }

        return map;
      },
    );
  }

  private async overlaySolvedForList(
    items: CachedProblem[],
    userId: string | null,
  ): Promise<PublicProblemModel[]> {
    const solvedMap = await this.getSolvedMap(userId);
    return items.map((p) => {
      const revived = this.reviveCachedProblem(p);
      const status = solvedMap[revived.id];
      return {
        ...revived,
        solved: status?.solved ?? false,
        attempted: status?.attempted ?? false,
      };
    });
  }


  private reviveCachedProblem(p: CachedProblem): CachedProblem {
    if (p.createdAt instanceof Date) return p;
    return { ...p, createdAt: new Date(p.createdAt as unknown as string) };
  }

  private toCachedProblem(problem: PublicProblemWithRelations): CachedProblem {
    return {
      id: problem.id,
      title: problem.title,
      slug: problem.slug,
      description: problem.description,
      difficulty: problem.difficulty,
      tier: problem.tier as UserTier,
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
      })),
      sampleTestCases: problem.testCases.map<PublicTestCaseModel>((tc) => ({
        id: tc.id,
        inlineInput: tc.inlineInput,
        inlineOutput: tc.inlineOutput,
        explanation: tc.explanation,
        order: tc.order,
      })),
      totalSubmissions: problem.stats?.totalSubmissions ?? 0,
      acceptanceRate:
        problem.stats && problem.stats.totalSubmissions > 0
          ? problem.stats.acceptedSubmissions / problem.stats.totalSubmissions
          : 0,
      createdAt: problem.createdAt,
    };
  }
}
