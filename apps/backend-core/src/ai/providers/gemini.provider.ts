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

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
  }[];
  modelVersion?: string;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { message?: string };
}

@Injectable()
export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly apiKey: string | undefined;
  private readonly model: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('GEMINI_API_KEY');
    this.model = config.get<string>('GEMINI_MODEL') ?? 'gemini-2.0-flash';
  }

  async complete(params: AiCompletionParams): Promise<AiCompletion> {
    if (!this.apiKey) {
      throw new InternalServerErrorException('GEMINI_API_KEY not configured');
    }

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent` +
      `?key=${encodeURIComponent(this.apiKey)}`;

    const body = {
      systemInstruction: { parts: [{ text: params.system }] },
      contents: [{ role: 'user', parts: [{ text: params.user }] }],
      generationConfig: {
        maxOutputTokens: params.maxOutputTokens ?? 512,
        temperature: params.temperature ?? 0.7,
      },
    };

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.warn(`Gemini fetch failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException('AI provider unavailable');
    }

    const payload = (await res.json().catch(() => null)) as GeminiResponse | null;
    if (!res.ok || !payload) {
      this.logger.warn(`Gemini ${res.status}: ${payload?.error?.message ?? 'no body'}`);
      throw new ServiceUnavailableException('AI provider request failed');
    }

    const text = payload.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? '')
      .join('');
    if (!text) {
      throw new ServiceUnavailableException('AI provider returned empty response');
    }

    return {
      text,
      provider: this.name,
      model: payload.modelVersion ?? this.model,
      inputTokens: payload.usageMetadata?.promptTokenCount,
      outputTokens: payload.usageMetadata?.candidatesTokenCount,
    };
  }
}
