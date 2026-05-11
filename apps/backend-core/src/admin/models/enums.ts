import { registerEnumType } from '@nestjs/graphql';
import { Difficulty, Language } from '@litecode/shared-types';
import { Permission } from '@litecode/db';

registerEnumType(Permission, { name: 'Permission' });
registerEnumType(Language, { name: 'Language' });
registerEnumType(Difficulty, { name: 'Difficulty' });
