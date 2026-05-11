import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtPayload } from '../auth/auth.service';
import { GqlCurrentUser } from '../auth/decorators/gql-current-user.decorator';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwt-auth.guard';
import { AddDiscussReplyInput } from './dto/add-discuss-reply.input';
import { CreateDiscussPostInput } from './dto/create-discuss-post.input';
import { DiscussPostsFilterInput } from './dto/discuss-posts-filter.input';
import { UpdateDiscussPostInput } from './dto/update-discuss-post.input';
import { UpdateDiscussReplyInput } from './dto/update-discuss-reply.input';
import { DiscussPostModel } from './models/discuss-post.model';
import { DiscussPostsPage } from './models/discuss-posts-page.model';
import { DiscussReplyModel } from './models/discuss-reply.model';
import { DiscussService } from './discuss.service';

@Resolver()
@UseGuards(GqlJwtAuthGuard)
export class DiscussResolver {
  constructor(private readonly service: DiscussService) {}

  @Query(() => DiscussPostsPage, {
    description: 'List discuss posts (newest first). Filter by tag, problem, or search term.',
  })
  async discussPosts(
    @Args('filter', { nullable: true, defaultValue: {} }) filter: DiscussPostsFilterInput,
  ): Promise<DiscussPostsPage> {
    return this.service.list(filter);
  }

  @Query(() => DiscussPostModel, {
    description: 'Fetch a single discuss post with its replies.',
  })
  async discussPost(@Args('id', { type: () => ID }) id: string): Promise<DiscussPostModel> {
    return this.service.getById(id);
  }

  @Mutation(() => DiscussPostModel, { description: 'Create a new discuss post.' })
  async createDiscussPost(
    @GqlCurrentUser() user: JwtPayload,
    @Args('input') input: CreateDiscussPostInput,
  ): Promise<DiscussPostModel> {
    return this.service.create(user.sub, input);
  }

  @Mutation(() => DiscussPostModel, { description: 'Edit one of your own posts.' })
  async updateDiscussPost(
    @GqlCurrentUser() user: JwtPayload,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateDiscussPostInput,
  ): Promise<DiscussPostModel> {
    return this.service.update(user.sub, id, input);
  }

  @Mutation(() => Boolean, { description: 'Delete one of your own posts.' })
  async deleteDiscussPost(
    @GqlCurrentUser() user: JwtPayload,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.service.delete(user.sub, id);
  }

  @Mutation(() => DiscussReplyModel, { description: 'Reply to a discuss post.' })
  async addDiscussReply(
    @GqlCurrentUser() user: JwtPayload,
    @Args('input') input: AddDiscussReplyInput,
  ): Promise<DiscussReplyModel> {
    return this.service.addReply(user.sub, input);
  }

  @Mutation(() => DiscussReplyModel, { description: 'Edit one of your own replies.' })
  async updateDiscussReply(
    @GqlCurrentUser() user: JwtPayload,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateDiscussReplyInput,
  ): Promise<DiscussReplyModel> {
    return this.service.updateReply(user.sub, id, input);
  }

  @Mutation(() => Boolean, { description: 'Delete one of your own replies.' })
  async deleteDiscussReply(
    @GqlCurrentUser() user: JwtPayload,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.service.deleteReply(user.sub, id);
  }
}
