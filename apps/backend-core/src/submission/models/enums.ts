import { registerEnumType } from '@nestjs/graphql';
import { SubmissionStatus, Verdict } from '@litecode/shared-types';

registerEnumType(SubmissionStatus, { name: 'SubmissionStatus' });
registerEnumType(Verdict, { name: 'Verdict' });
