import { Field, InputType, Int } from '@nestjs/graphql';
import { Difficulty } from '@litecode/db';
import { SignatureInput } from './signature.input';
import { TemplateInput } from './template.input';
import '../models/enums';

@InputType()
export class CreateProblemInput {
  @Field(() => String)
  title: string;

  @Field(() => String, { description: 'URL-friendly slug, must be unique' })
  slug: string;

  @Field(() => String)
  description: string;

  @Field(() => Difficulty)
  difficulty: Difficulty;

  @Field(() => Int, {
    nullable: true,
    description: 'Numeric difficulty rating (typical range 800–3500). Defaults to 1500 if omitted.',
  })
  rating?: number;

  @Field(() => SignatureInput)
  signature: SignatureInput;

  @Field(() => [String], {
    description: 'IDs of existing topics to link. Backend errors if any ID is unknown.',
  })
  topicIds: string[];

  @Field(() => [TemplateInput], {
    nullable: true,
    description: 'Optional inline templates. Use setCodeTemplate later if you prefer separate calls.',
  })
  templates?: TemplateInput[];
}
