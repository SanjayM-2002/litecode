import { registerEnumType } from '@nestjs/graphql';
import { Gender, Role } from '@litecode/shared-types';

registerEnumType(Gender, { name: 'Gender' });
registerEnumType(Role, { name: 'Role' });
