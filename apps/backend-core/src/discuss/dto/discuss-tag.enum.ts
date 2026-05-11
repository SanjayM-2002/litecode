import { registerEnumType } from '@nestjs/graphql';
import { DiscussTag } from '@litecode/shared-types';

registerEnumType(DiscussTag, { name: 'DiscussTag' });

export { DiscussTag };
