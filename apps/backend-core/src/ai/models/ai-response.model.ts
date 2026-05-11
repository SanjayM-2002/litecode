import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('AiResponse')
export class AiResponseModel {
  @Field(() => String)
  text: string;

  @Field(() => String, { description: 'Provider name (mock|openai|gemini|grok).' })
  provider: string;

  @Field(() => String)
  model: string;

  @Field(() => Int, { nullable: true })
  inputTokens?: number;

  @Field(() => Int, { nullable: true })
  outputTokens?: number;
}
