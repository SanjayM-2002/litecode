import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaService } from '@litecode/db';
import { buildMeta } from '../common/models/pagination-meta.model';
import { clampPagination } from '../common/dto/pagination.input';
import { PublicAuthorModel } from '../common/models/public-author.model';
import { AddDiscussReplyInput } from './dto/add-discuss-reply.input';
import { CreateDiscussPostInput } from './dto/create-discuss-post.input';
import { DiscussPostsFilterInput } from './dto/discuss-posts-filter.input';
import { UpdateDiscussPostInput } from './dto/update-discuss-post.input';
import { UpdateDiscussReplyInput } from './dto/update-discuss-reply.input';
import { DiscussPostModel } from './models/discuss-post.model';
import { DiscussPostsPage } from './models/discuss-posts-page.model';
import { DiscussReplyModel } from './models/discuss-reply.model';

const TITLE_MAX = 200;
const CONTENT_MAX = 50_000;
const REPLY_MAX = 10_000;

const DISCUSS_INCLUDE = {
  author: { select: { id: true, name: true } },
  problem: { select: { id: true, slug: true, title: true } },
  replies: {
    orderBy: { createdAt: 'asc' as const },
    include: { author: { select: { id: true, name: true } } },
  },
} satisfies Prisma.DiscussPostInclude;

type DiscussPostWithRelations = Prisma.DiscussPostGetPayload<{
  include: typeof DISCUSS_INCLUDE;
}>;

@Injectable()
export class DiscussService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: DiscussPostsFilterInput): Promise<DiscussPostsPage> {
    const where: Prisma.DiscussPostWhereInput = {};
    if (filter.tag) where.tag = filter.tag;
    if (filter.problemId) where.problemId = filter.problemId;
    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { content: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const { page, limit, skip } = clampPagination(filter);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.discussPost.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: DISCUSS_INCLUDE,
      }),
      this.prisma.discussPost.count({ where }),
    ]);

    return {
      items: items.map((p) => this.toModel(p)),
      meta: buildMeta(total, page, limit),
    };
  }

  async getById(id: string): Promise<DiscussPostModel> {
    const post = await this.prisma.discussPost.findUnique({
      where: { id },
      include: DISCUSS_INCLUDE,
    });
    if (!post) throw new NotFoundException('Post not found');
    return this.toModel(post);
  }

  async create(authorId: string, input: CreateDiscussPostInput): Promise<DiscussPostModel> {
    this.validateText('title', input.title, 1, TITLE_MAX);
    this.validateText('content', input.content, 1, CONTENT_MAX);

    if (input.problemId) await this.assertProblemExists(input.problemId);

    const created = await this.prisma.discussPost.create({
      data: {
        authorId,
        title: input.title.trim(),
        content: input.content,
        tag: input.tag,
        problemId: input.problemId ?? null,
      },
      include: DISCUSS_INCLUDE,
    });
    return this.toModel(created);
  }

  async update(
    authorId: string,
    id: string,
    input: UpdateDiscussPostInput,
  ): Promise<DiscussPostModel> {
    const existing = await this.prisma.discussPost.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!existing) throw new NotFoundException('Post not found');
    if (existing.authorId !== authorId) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    const data: Prisma.DiscussPostUpdateInput = {};
    if (input.title !== undefined) {
      this.validateText('title', input.title, 1, TITLE_MAX);
      data.title = input.title.trim();
    }
    if (input.content !== undefined) {
      this.validateText('content', input.content, 1, CONTENT_MAX);
      data.content = input.content;
    }
    if (input.tag !== undefined) data.tag = input.tag;
    if (input.problemId !== undefined) {
      if (input.problemId === null) {
        data.problem = { disconnect: true };
      } else {
        await this.assertProblemExists(input.problemId);
        data.problem = { connect: { id: input.problemId } };
      }
    }

    const updated = await this.prisma.discussPost.update({
      where: { id },
      data,
      include: DISCUSS_INCLUDE,
    });
    return this.toModel(updated);
  }

  async delete(authorId: string, id: string): Promise<boolean> {
    const existing = await this.prisma.discussPost.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!existing) throw new NotFoundException('Post not found');
    if (existing.authorId !== authorId) {
      throw new ForbiddenException('You can only delete your own posts');
    }
    await this.prisma.discussPost.delete({ where: { id } });
    return true;
  }

  async addReply(authorId: string, input: AddDiscussReplyInput): Promise<DiscussReplyModel> {
    this.validateText('content', input.content, 1, REPLY_MAX);

    const post = await this.prisma.discussPost.findUnique({
      where: { id: input.postId },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Post not found');

    const reply = await this.prisma.discussReply.create({
      data: { postId: input.postId, authorId, content: input.content },
      include: { author: { select: { id: true, name: true } } },
    });
    return this.toReplyModel(reply);
  }

  async updateReply(
    authorId: string,
    id: string,
    input: UpdateDiscussReplyInput,
  ): Promise<DiscussReplyModel> {
    const existing = await this.prisma.discussReply.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!existing) throw new NotFoundException('Reply not found');
    if (existing.authorId !== authorId) {
      throw new ForbiddenException('You can only edit your own replies');
    }

    this.validateText('content', input.content, 1, REPLY_MAX);

    const reply = await this.prisma.discussReply.update({
      where: { id },
      data: { content: input.content },
      include: { author: { select: { id: true, name: true } } },
    });
    return this.toReplyModel(reply);
  }

  async deleteReply(authorId: string, id: string): Promise<boolean> {
    const existing = await this.prisma.discussReply.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!existing) throw new NotFoundException('Reply not found');
    if (existing.authorId !== authorId) {
      throw new ForbiddenException('You can only delete your own replies');
    }
    await this.prisma.discussReply.delete({ where: { id } });
    return true;
  }

  // ---- helpers ----

  private async assertProblemExists(problemId: string) {
    const problem = await this.prisma.problem.findFirst({
      where: { id: problemId, isPublished: true },
      select: { id: true },
    });
    if (!problem) throw new NotFoundException('Problem not found or unpublished');
  }

  private toModel(p: DiscussPostWithRelations): DiscussPostModel {
    return {
      id: p.id,
      author: this.toAuthor(p.author),
      title: p.title,
      content: p.content,
      tag: p.tag,
      problem: p.problem ? { id: p.problem.id, slug: p.problem.slug, title: p.problem.title } : null,
      replies: p.replies.map((r) => this.toReplyModel(r)),
      replyCount: p.replies.length,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private toReplyModel(r: {
    id: string;
    postId: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    author: { id: string; name: string | null };
  }): DiscussReplyModel {
    return {
      id: r.id,
      postId: r.postId,
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
