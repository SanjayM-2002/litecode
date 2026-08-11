import { Injectable } from '@nestjs/common';
import {
  AiCompletion,
  AiCompletionParams,
  AiProvider,
} from './ai-provider.interface';


@Injectable()
export class MockAiProvider implements AiProvider {
  readonly name = 'mock';

  async complete(params: AiCompletionParams): Promise<AiCompletion> {
    return {
      text: `[mock] received system=${params.system.length}chars user=${params.user.length}chars`,
      provider: this.name,
      model: 'mock-1',
    };
  }
}
