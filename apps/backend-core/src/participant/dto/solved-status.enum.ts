import { registerEnumType } from '@nestjs/graphql';
import { SolvedStatus } from '@litecode/shared-types';

registerEnumType(SolvedStatus, { name: 'SolvedStatus' });

export { SolvedStatus };
