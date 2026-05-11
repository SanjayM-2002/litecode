import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Language } from '@litecode/shared-types';
import '../../admin/models/enums';

/**
 * Participant-facing code template. Intentionally OMITS driverCode.
 */
@ObjectType('PublicCodeTemplate')
export class PublicCodeTemplateModel {
  @Field(() => ID)
  id: string;

  @Field(() => Language)
  language: Language;

  @Field(() => String, { description: 'Class skeleton shown in the user editor.' })
  starterCode: string;
}
