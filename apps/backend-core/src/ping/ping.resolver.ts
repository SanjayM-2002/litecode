import { Resolver, Query } from '@nestjs/graphql';

@Resolver()
export class PingResolver {
  @Query(() => String, { description: 'A simple ping query to verify GraphQL is working.' })
  ping(): string {
    return 'pong';
  }
}
