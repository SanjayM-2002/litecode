import { registerEnumType } from '@nestjs/graphql';
import { Difficulty, Language, Permission } from '@litecode/db';

registerEnumType(Permission, { name: 'Permission' });
registerEnumType(Language, { name: 'Language' });
registerEnumType(Difficulty, { name: 'Difficulty' });
