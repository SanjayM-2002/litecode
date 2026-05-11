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

// OpenRouter exposes an OpenAI-compatible chat-completions endpoint, so this
// provider is structurally the same as OpenAiProvider. The win is model
// flexibility: one API key gives you access to GPT, Claude, Gemini, Llama,
// etc. via slash-namespaced model ids like `anthropic/claude-3.5-sonnet`.
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface OpenRouterResponse {
  choices?: { message?: { content?: string } }[];
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

@Injectable()
export class OpenRouterProvider implements AiProvider {
  readonly name = 'openrouter';
  private readonly logger = new Logger(OpenRouterProvider.name);
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly referer: string | undefined;
  private readonly title: string | undefined;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('OPENROUTER_API_KEY');
    this.model = config.get<string>('OPENROUTER_MODEL') ?? 'openai/gpt-4o-mini';
    // Optional app-identification headers — OpenRouter uses them for their
    // public leaderboard / analytics. Both safely omitted if unset.
    this.referer = config.get<string>('OPENROUTER_REFERER');
    this.title = config.get<string>('OPENROUTER_TITLE');
  }

  async complete(params: AiCompletionParams): Promise<AiCompletion> {
    if (!this.apiKey) {
      throw new InternalServerErrorException('OPENROUTER_API_KEY not configured');
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

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      authorization: `Bearer ${this.apiKey}`,
    };
    if (this.referer) headers['http-referer'] = this.referer;
    if (this.title) headers['x-title'] = this.title;

    let res: Response;
    try {
      res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.warn(`OpenRouter fetch failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException('AI provider unavailable');
    }

    const payload = (await res.json().catch(() => null)) as OpenRouterResponse | null;
    if (!res.ok || !payload) {
      this.logger.warn(`OpenRouter ${res.status}: ${payload?.error?.message ?? 'no body'}`);
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
