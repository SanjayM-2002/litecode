import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { AiService } from './ai.service';
import { AiResolver } from './ai.resolver';
import { AiProviderFactory } from './providers/ai-provider.factory';
import { MockAiProvider } from './providers/mock.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { GrokProvider } from './providers/grok.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';

@Module({
  imports: [ConfigModule, AuthModule],
  providers: [
    MockAiProvider,
    OpenAiProvider,
    GeminiProvider,
    GrokProvider,
    OpenRouterProvider,
    AiProviderFactory,
    AiService,
    AiResolver,
  ],
})
export class AiModule {}
