import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@litecode/db';
import { AiCompletion } from './providers/ai-provider.interface';
import { AiProviderFactory } from './providers/ai-provider.factory';
import { AiHintInput } from './dto/ai-hint.input';
import { AiHelpInput } from './dto/ai-help.input';
import { AiRoastInput } from './dto/ai-roast.input';

const HINT_SYSTEM = [
  'You are an algorithms coach. The user is stuck on a coding problem.',
  'Give one small nudge that points toward the right approach.',
  'Never reveal the full solution or write code that solves the problem.',
  'Be encouraging. Keep the reply under 80 words.',
].join(' ');

const HELP_SYSTEM = [
  'You are an algorithms tutor. The user has submitted their work-in-progress code',
  'and a specific question. Explain the conceptual approach and point out gaps',
  'in their reasoning. You may show small illustrative snippets, but do not',
  'write the complete solution. Keep the reply under 200 words.',
].join(' ');

const ROAST_SYSTEM = [
  'You are a senior engineer doing a sharp, funny code review. Roast the code',
  'in 3-5 sentences: call out bad naming, suboptimal patterns, redundancy.',
  'Be specific to what is actually in the code; do not make things up.',
  'End with exactly one genuinely useful piece of advice.',
].join(' ');

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: AiProviderFactory,
  ) {}

  async hint(input: AiHintInput): Promise<AiCompletion> {
    const problem = await this.loadProblem(input.problemId);
    const userPrompt = [
      `Problem: ${problem.title} (${problem.difficulty})`,
      '',
      problem.description,
      input.code
        ? `\nThe user's current attempt${input.language ? ` (${input.language})` : ''}:\n\`\`\`\n${input.code}\n\`\`\``
        : '',
      '\nGive a single hint.',
    ].join('\n');

    return this.providerFactory.get().complete({
      system: HINT_SYSTEM,
      user: userPrompt,
      maxOutputTokens: 200,
      temperature: 0.7,
    });
  }

  async help(input: AiHelpInput): Promise<AiCompletion> {
    const problem = await this.loadProblem(input.problemId);
    const userPrompt = [
      `Problem: ${problem.title} (${problem.difficulty})`,
      '',
      problem.description,
      `\nThe user's code (${input.language}):\n\`\`\`\n${input.code}\n\`\`\``,
      `\nQuestion: ${input.question}`,
    ].join('\n');

    return this.providerFactory.get().complete({
      system: HELP_SYSTEM,
      user: userPrompt,
      maxOutputTokens: 500,
      temperature: 0.5,
    });
  }

  async roast(userId: string, input: AiRoastInput): Promise<AiCompletion> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: input.submissionId },
      select: {
        userId: true,
        code: true,
        language: true,
        problem: { select: { title: true, difficulty: true, description: true } },
      },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.userId !== userId) {
      throw new ForbiddenException('You can only roast your own submissions');
    }

    const userPrompt = [
      `Problem: ${submission.problem.title} (${submission.problem.difficulty})`,
      '',
      submission.problem.description,
      `\nUser's submitted code (${submission.language}):\n\`\`\`\n${submission.code}\n\`\`\``,
      '\nRoast it.',
    ].join('\n');

    return this.providerFactory.get().complete({
      system: ROAST_SYSTEM,
      user: userPrompt,
      maxOutputTokens: 300,
      temperature: 0.9,
    });
  }

  private async loadProblem(problemId: string) {
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        id: true,
        title: true,
        description: true,
        difficulty: true,
        isPublished: true,
      },
    });
    if (!problem || !problem.isPublished) {
      throw new NotFoundException('Problem not found');
    }
    return problem;
  }
}
