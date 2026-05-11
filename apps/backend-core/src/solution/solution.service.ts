import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaService } from '@litecode/db';
import { buildMeta } from '../common/models/pagination-meta.model';
import { clampPagination } from '../common/dto/pagination.input';
import { CreateSolutionInput } from './dto/create-solution.input';
import { UpdateSolutionInput } from './dto/update-solution.input';
import { AddSolutionReplyInput } from './dto/add-solution-reply.input';
import { UpdateSolutionReplyInput } from './dto/update-solution-reply.input';
import { SolutionsFilterInput } from './dto/solutions-filter.input';
import { SolutionModel } from './models/solution.model';
import { SolutionReplyModel } from './models/solution-reply.model';
import { SolutionsPage } from './models/solutions-page.model';
import { PublicAuthorModel } from '../common/models/public-author.model';

const TITLE_MAX = 200;
const CONTENT_MAX = 50_000;
const CODE_MAX = 100_000;
const REPLY_MAX = 10_000;

const SOLUTION_INCLUDE = {
  author: { select: { id: true, name: true } },
  replies: {
    orderBy: { createdAt: 'asc' as const },
    include: { author: { select: { id: true, name: true } } },
  },
} satisfies Prisma.SolutionInclude;

type SolutionWithRelations = Prisma.SolutionGetPayload<{
  include: typeof SOLUTION_INCLUDE;
}>;

@Injectable()
export class SolutionService {
  constructor(private readonly prisma: PrismaService) {}

  async listForProblem(filter: SolutionsFilterInput): Promise<SolutionsPage> {
    const where: Prisma.SolutionWhereInput = { problemId: filter.problemId };
    if (filter.language) where.language = filter.language;

    const { page, limit, skip } = clampPagination(filter);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.solution.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: SOLUTION_INCLUDE,
      }),
      this.prisma.solution.count({ where }),
    ]);

    return {
      items: items.map((s) => this.toModel(s)),
      meta: buildMeta(total, page, limit),
    };
  }

  async getById(id: string): Promise<SolutionModel> {
    const solution = await this.prisma.solution.findUnique({
      where: { id },
      include: SOLUTION_INCLUDE,
    });
    if (!solution) throw new NotFoundException('Solution not found');
    return this.toModel(solution);
  }

  async create(authorId: string, input: CreateSolutionInput): Promise<SolutionModel> {
    this.validateText('title', input.title, 1, TITLE_MAX);
    this.validateText('content', input.content, 1, CONTENT_MAX);
    this.validateText('code', input.code, 1, CODE_MAX);

    // Make sure the problem exists & is published.
    const problem = await this.prisma.problem.findFirst({
      where: { id: input.problemId, isPublished: true },
      select: { id: true },
    });
    if (!problem) throw new NotFoundException('Problem not found or unpublished');

    const created = await this.prisma.solution.create({
      data: {
        problemId: input.problemId,
        authorId,
        title: input.title.trim(),
        language: input.language,
        code: input.code,
        content: input.content,
      },
      include: SOLUTION_INCLUDE,
    });
    return this.toModel(created);
  }

  async update(
    authorId: string,
    id: string,
    input: UpdateSolutionInput,
  ): Promise<SolutionModel> {
    const existing = await this.prisma.solution.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!existing) throw new NotFoundException('Solution not found');
    if (existing.authorId !== authorId) {
      throw new ForbiddenException('You can only edit your own solutions');
    }

    const data: Prisma.SolutionUpdateInput = {};
    if (input.title !== undefined) {
      this.validateText('title', input.title, 1, TITLE_MAX);
      data.title = input.title.trim();
    }
    if (input.content !== undefined) {
      this.validateText('content', input.content, 1, CONTENT_MAX);
      data.content = input.content;
    }
    if (input.code !== undefined) {
      this.validateText('code', input.code, 1, CODE_MAX);
      data.code = input.code;
    }
    if (input.language !== undefined) data.language = input.language;

    const updated = await this.prisma.solution.update({
      where: { id },
      data,
      include: SOLUTION_INCLUDE,
    });
    return this.toModel(updated);
  }

  async delete(authorId: string, id: string): Promise<boolean> {
    const existing = await this.prisma.solution.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!existing) throw new NotFoundException('Solution not found');
    if (existing.authorId !== authorId) {
      throw new ForbiddenException('You can only delete your own solutions');
    }
    await this.prisma.solution.delete({ where: { id } });
    return true;
  }

  async addReply(
    authorId: string,
    input: AddSolutionReplyInput,
  ): Promise<SolutionReplyModel> {
    this.validateText('content', input.content, 1, REPLY_MAX);

    const solution = await this.prisma.solution.findUnique({
      where: { id: input.solutionId },
      select: { id: true },
    });
    if (!solution) throw new NotFoundException('Solution not found');

    const reply = await this.prisma.solutionReply.create({
      data: {
        solutionId: input.solutionId,
        authorId,
        content: input.content,
      },
      include: { author: { select: { id: true, name: true } } },
    });
    return this.toReplyModel(reply);
  }

  async updateReply(
    authorId: string,
    id: string,
    input: UpdateSolutionReplyInput,
  ): Promise<SolutionReplyModel> {
    const existing = await this.prisma.solutionReply.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!existing) throw new NotFoundException('Reply not found');
    if (existing.authorId !== authorId) {
      throw new ForbiddenException('You can only edit your own replies');
    }

    this.validateText('content', input.content, 1, REPLY_MAX);

    const reply = await this.prisma.solutionReply.update({
      where: { id },
      data: { content: input.content },
      include: { author: { select: { id: true, name: true } } },
    });
    return this.toReplyModel(reply);
  }

  async deleteReply(authorId: string, id: string): Promise<boolean> {
    const existing = await this.prisma.solutionReply.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!existing) throw new NotFoundException('Reply not found');
    if (existing.authorId !== authorId) {
      throw new ForbiddenException('You can only delete your own replies');
    }
    await this.prisma.solutionReply.delete({ where: { id } });
    return true;
  }

  // ---- helpers ----

  private toModel(s: SolutionWithRelations): SolutionModel {
    return {
      id: s.id,
      problemId: s.problemId,
      author: this.toAuthor(s.author),
      title: s.title,
      language: s.language,
      code: s.code,
      content: s.content,
      replies: s.replies.map((r) => this.toReplyModel(r)),
      replyCount: s.replies.length,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  private toReplyModel(r: {
    id: string;
    solutionId: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    author: { id: string; name: string | null };
  }): SolutionReplyModel {
    return {
      id: r.id,
      solutionId: r.solutionId,
      author: this.toAuthor(r.author),
      content: r.content,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  private toAuthor(u: { id: string; name: string | null }): PublicAuthorModel {
    return { id: u.id, name: u.name };
  }

  private validateText(field: string, value: string, min: number, max: number) {
    const trimmed = value.trim();
    if (trimmed.length < min) {
      throw new BadRequestException(`${field} is too short`);
    }
    if (value.length > max) {
      throw new BadRequestException(`${field} exceeds ${max} chars`);
    }
  }
}
