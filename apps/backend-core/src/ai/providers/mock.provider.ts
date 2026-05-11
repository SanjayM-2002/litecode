import { Injectable } from '@nestjs/common';
import {
  AiCompletion,
  AiCompletionParams,
  AiProvider,
} from './ai-provider.interface';

// Default provider used in local dev when no real API keys are wired up.
// Returns a deterministic canned response so the request/response plumbing
// can be exercised end-to-end without spending tokens.
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
