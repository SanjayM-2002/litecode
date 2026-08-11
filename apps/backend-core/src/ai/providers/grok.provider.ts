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


const GROK_URL = 'https://api.x.ai/v1/chat/completions';

interface GrokResponse {
  choices?: { message?: { content?: string } }[];
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

@Injectable()
export class GrokProvider implements AiProvider {
  readonly name = 'grok';
  private readonly logger = new Logger(GrokProvider.name);
  private readonly apiKey: string | undefined;
  private readonly model: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('GROK_API_KEY');
    this.model = config.get<string>('GROK_MODEL') ?? 'grok-2-1212';
  }

  async complete(params: AiCompletionParams): Promise<AiCompletion> {
    if (!this.apiKey) {
      throw new InternalServerErrorException('GROK_API_KEY not configured');
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
      res = await fetch(GROK_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.warn(`Grok fetch failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException('AI provider unavailable');
    }

    const payload = (await res.json().catch(() => null)) as GrokResponse | null;
    if (!res.ok || !payload) {
      this.logger.warn(`Grok ${res.status}: ${payload?.error?.message ?? 'no body'}`);
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
