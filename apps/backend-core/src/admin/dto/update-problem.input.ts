import { Field, InputType, Int } from '@nestjs/graphql';
import { Difficulty } from '@litecode/db';
import { SignatureInput } from './signature.input';
import '../models/enums';

@InputType()
export class UpdateProblemInput {
  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => String, { nullable: true })
  slug?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Difficulty, { nullable: true })
  difficulty?: Difficulty;

  @Field(() => Int, { nullable: true, description: 'Numeric difficulty rating (typical range 800–3500).' })
  rating?: number;

  @Field(() => SignatureInput, { nullable: true })
  signature?: SignatureInput;

  @Field(() => [String], {
    nullable: true,
    description: 'Replaces all topic links by IDs. Pass [] to clear.',
  })
  topicIds?: string[];
}
