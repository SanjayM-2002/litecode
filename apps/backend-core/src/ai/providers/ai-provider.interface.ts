export interface AiCompletionParams {
  system: string;
  user: string;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface AiCompletion {
  text: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface AiProvider {
  readonly name: string;
  complete(params: AiCompletionParams): Promise<AiCompletion>;
}

export const AI_PROVIDER_TOKEN = Symbol('AI_PROVIDER');
