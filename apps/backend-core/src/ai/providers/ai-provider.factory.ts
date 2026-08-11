import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from './ai-provider.interface';
import { MockAiProvider } from './mock.provider';
import { OpenAiProvider } from './openai.provider';
import { GeminiProvider } from './gemini.provider';
import { GrokProvider } from './grok.provider';
import { OpenRouterProvider } from './openrouter.provider';

type ProviderName = 'mock' | 'openai' | 'gemini' | 'grok' | 'openrouter';

// Adding a new provider: implement AiProvider, register it in the constructor,
// add a case in `resolve()`.
@Injectable()
export class AiProviderFactory {
  private readonly logger = new Logger(AiProviderFactory.name);
  private readonly registry: Record<ProviderName, AiProvider>;
  private readonly selected: AiProvider;

  constructor(
    config: ConfigService,
    mock: MockAiProvider,
    openai: OpenAiProvider,
    gemini: GeminiProvider,
    grok: GrokProvider,
    openrouter: OpenRouterProvider,
  ) {
    this.registry = { mock, openai, gemini, grok, openrouter };
    const raw = (config.get<string>('AI_PROVIDER') ?? 'mock').toLowerCase();
    this.selected = this.resolve(raw);
    this.logger.log(`AI provider: ${this.selected.name}`);
  }

  get(): AiProvider {
    return this.selected;
  }

  private resolve(name: string): AiProvider {
    if (this.isProviderName(name)) return this.registry[name];
    this.logger.warn(`Unknown AI_PROVIDER='${name}', falling back to mock`);
    return this.registry.mock;
  }

  private isProviderName(name: string): name is ProviderName {
    return name in this.registry;
  }
}
