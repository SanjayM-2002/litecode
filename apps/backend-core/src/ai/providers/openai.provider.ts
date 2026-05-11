import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiCompletion,
  AiCompletionParams,
  AiProvider,
} from './ai-provider.interface';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

interface OpenAiResponse {
  choices?: { message?: { content?: string } }[];
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

@Injectable()
export class OpenAiProvider implements AiProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAiProvider.name);
  private readonly apiKey: string | undefined;
  private readonly model: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('OPENAI_API_KEY');
    this.model = config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';
  }

  async complete(params: AiCompletionParams): Promise<AiCompletion> {
    if (!this.apiKey) {
      throw new InternalServerErrorException('OPENAI_API_KEY not configured');
    }

    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: params.user },
      ],
      max_tokens: params.maxOutputTokens ?? 512,
      temperature: params.temperature ?? 0.7,
    };

    let res: Response;
    try {
      res = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.warn(`OpenAI fetch failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException('AI provider unavailable');
    }

    const payload = (await res.json().catch(() => null)) as OpenAiResponse | null;
    if (!res.ok || !payload) {
      this.logger.warn(`OpenAI ${res.status}: ${payload?.error?.message ?? 'no body'}`);
      throw new ServiceUnavailableException('AI provider request failed');
    }

    const text = payload.choices?.[0]?.message?.content;
    if (!text) {
      throw new ServiceUnavailableException('AI provider returned empty response');
    }

    return {
      text,
      provider: this.name,
      model: payload.model ?? this.model,
      inputTokens: payload.usage?.prompt_tokens,
      outputTokens: payload.usage?.completion_tokens,
    };
  }
}
