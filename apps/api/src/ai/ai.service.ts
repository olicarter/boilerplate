import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

export interface ArgumentCluster {
  theme: string;
  for_points: string[];
  against_points: string[];
}

export interface ProposalDraft {
  title: string;
  description: string;
  suggested_type: 'standard' | 'discussion' | 'multiple_choice' | 'consent' | 'temperature_check';
  suggested_threshold: number;
}

export interface InterpretedVote {
  choice: 'yes' | 'no' | 'abstain';
  rationale: string;
  confidence: number;
}

@Injectable()
export class AiService {
  private readonly client: Anthropic | null;

  constructor() {
    this.client = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;
  }

  private async call(userMessage: string, system: string, maxTokens = 1024): Promise<string> {
    if (!this.client) throw new ServiceUnavailableException('AI features require ANTHROPIC_API_KEY to be configured');
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
    });
    const block = response.content[0];
    if (block.type !== 'text') throw new Error('Unexpected response type from AI');
    return block.text;
  }

  async summarise(title: string, description: string): Promise<string> {
    return this.call(
      `Summarise this proposal in 2–3 sentences. Be neutral and concise — capture what it proposes, not your opinion of it.\n\nTitle: ${title}\n\nDescription:\n${description}`,
      'You summarise governance proposals clearly and neutrally for people who want a quick overview.',
      256,
    );
  }

  async rewrite(title: string, description: string): Promise<string> {
    return this.call(
      `Rewrite the following proposal description in plain, everyday language. Remove jargon, legalese, and technical terms. Keep the same meaning but make it accessible to someone with no specialist knowledge. Return only the rewritten text, no preamble.\n\nTitle: ${title}\n\nDescription:\n${description}`,
      'You rewrite governance documents in plain English, making them accessible to everyone.',
      1024,
    );
  }

  async clusterArguments(forArgs: string[], againstArgs: string[]): Promise<ArgumentCluster[]> {
    if (forArgs.length + againstArgs.length < 3) return [];
    const text = this.call(
      `You are given a list of arguments for and against a proposal. Group them into 2–4 thematic clusters. For each cluster give a short theme label and list which arguments (quoted briefly) belong under it, split by for/against.\n\nReturn ONLY valid JSON in this exact shape, no markdown:\n[{"theme":"...","for_points":["..."],"against_points":["..."]}]\n\nArguments FOR:\n${forArgs.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\nArguments AGAINST:\n${againstArgs.map((a, i) => `${i + 1}. ${a}`).join('\n')}`,
      'You identify themes in governance debates and return structured JSON.',
      1024,
    );
    try {
      return JSON.parse(await text) as ArgumentCluster[];
    } catch {
      return [];
    }
  }

  async draftProposal(description: string): Promise<ProposalDraft> {
    const text = await this.call(
      `A user wants to create a governance proposal. They described it as:\n\n"${description}"\n\nDraft a well-structured proposal and return ONLY valid JSON (no markdown) with this shape:\n{"title":"...","description":"...","suggested_type":"standard|discussion|multiple_choice|consent|temperature_check","suggested_threshold":50}\n\nThe description should be 2–4 paragraphs in plain prose. suggested_type should be the most appropriate vote type. suggested_threshold should be 50 for ordinary proposals, higher (66 or 75) for significant ones.`,
      'You draft clear, well-structured governance proposals from rough descriptions.',
      1536,
    );
    try {
      return JSON.parse(text) as ProposalDraft;
    } catch {
      return {
        title: 'Untitled proposal',
        description,
        suggested_type: 'standard',
        suggested_threshold: 50,
      };
    }
  }

  async interpretVote(proposalTitle: string, proposalDescription: string, input: string): Promise<InterpretedVote> {
    const text = await this.call(
      `A member of a voting platform has written the following to describe how they want to vote on a proposal:\n\n"${input}"\n\nProposal: ${proposalTitle}\nSummary: ${proposalDescription.slice(0, 500)}\n\nInterpret their intent and return ONLY valid JSON (no markdown):\n{"choice":"yes|no|abstain","rationale":"one sentence summarising their reason","confidence":0-100}\n\nconfidence reflects how clearly the input expressed a choice.`,
      'You interpret natural language expressions of voting intent into structured choices.',
      256,
    );
    try {
      return JSON.parse(text) as InterpretedVote;
    } catch {
      return { choice: 'abstain', rationale: input, confidence: 0 };
    }
  }

  async translate(text: string, targetLanguage: string): Promise<string> {
    return this.call(
      `Translate the following text into ${targetLanguage}. Preserve any markdown formatting. Return only the translated text, no preamble or explanation.\n\n${text}`,
      'You are a professional translator. Translate text accurately while preserving formatting, tone, and meaning.',
      2048,
    );
  }
}
