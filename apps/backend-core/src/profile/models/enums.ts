import { registerEnumType } from '@nestjs/graphql';
import { Gender, Role } from '@litecode/db';

registerEnumType(Gender, { name: 'Gender' });
registerEnumType(Role, { name: 'Role' });
