import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GradeSubmissionJob, QUEUES } from '@litecode/queue';
import { Prisma, PrismaService } from '@litecode/db';
import { Role, SubmissionStatus } from '@litecode/shared-types';
import { Queue } from 'bullmq';
import { clampPagination } from '../common/dto/pagination.input';
import { buildMeta } from '../common/models/pagination-meta.model';
import { JwtPayload } from '../auth/auth.service';
import { SubmitSolutionInput } from './dto/submit-solution.input';
import { MySubmissionsFilterInput } from './dto/my-submissions-filter.input';
import { SubmissionModel } from './models/submission.model';
import { SubmissionsPage } from './models/submissions-page.model';

const MAX_CODE_LENGTH = 65_536;

@Injectable()
export class SubmissionService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.gradeSubmission)
    private readonly gradeQueue: Queue<GradeSubmissionJob>,
  ) {}

  async submit(userId: string, input: SubmitSolutionInput): Promise<SubmissionModel> {
    if (!input.code || input.code.length === 0) {
      throw new BadRequestException('code cannot be empty');
    }
    if (input.code.length > MAX_CODE_LENGTH) {
      throw new BadRequestException(
        `code exceeds max length of ${MAX_CODE_LENGTH} characters`,
      );
    }

    const problem = await this.prisma.problem.findUnique({
      where: { id: input.problemId },
      select: { id: true, isPublished: true },
    });
    if (!problem) throw new NotFoundException('Problem not found');
    if (!problem.isPublished) {
      throw new BadRequestException('Problem is not published');
    }

    const template = await this.prisma.codeTemplate.findUnique({
      where: {
        problemId_language: { problemId: input.problemId, language: input.language },
      },
      select: { id: true },
    });
    if (!template) {
      throw new BadRequestException(
        `Language ${input.language} is not supported for this problem`,
      );
    }

    const submission = await this.prisma.submission.create({
      data: {
        userId,
        problemId: input.problemId,
        language: input.language,
        code: input.code,
        status: SubmissionStatus.PENDING,
      },
    });

    await this.gradeQueue.add(
      'grade',
      { submissionId: submission.id },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 1_000,
        removeOnFail: 5_000,
      },
    );

    return submission as unknown as SubmissionModel;
  }

  async getById(id: string, requester: JwtPayload): Promise<SubmissionModel> {
    const submission = await this.prisma.submission.findUnique({ where: { id } });
    if (!submission) throw new NotFoundException('Submission not found');

    const isOwner = submission.userId === requester.sub;
    const isAdmin = requester.role === Role.ADMIN;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have access to this submission');
    }

    return submission as unknown as SubmissionModel;
  }

  async listMine(
    userId: string,
    filter: MySubmissionsFilterInput,
  ): Promise<SubmissionsPage> {
    const where: Prisma.SubmissionWhereInput = { userId };
    if (filter.problemId) where.problemId = filter.problemId;
    if (filter.language) where.language = filter.language;
    if (filter.status) where.status = filter.status;
    if (filter.verdict) where.verdict = filter.verdict;

    const { page, limit, skip } = clampPagination(filter);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.submission.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.submission.count({ where }),
    ]);

    return {
      items: items as unknown as SubmissionModel[],
      meta: buildMeta(total, page, limit),
    };
  }
}
