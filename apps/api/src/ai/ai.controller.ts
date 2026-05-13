import { Body, Controller, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '../auth/auth.guard';
import { AiService, type ProposalDraft, type InterpretedVote } from './ai.service';
import { Proposal } from '../proposals/proposal.entity';
import { Argument } from '../arguments/argument.entity';

@Controller('ai')
@UseGuards(AuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    @InjectRepository(Proposal) private readonly proposalRepo: Repository<Proposal>,
    @InjectRepository(Argument) private readonly argumentRepo: Repository<Argument>,
  ) {}

  @Post('summarise')
  async summarise(@Body() body: { proposal_id: string }): Promise<{ summary: string }> {
    const proposal = await this.proposalRepo.findOne({ where: { id: body.proposal_id } });
    if (!proposal) throw new NotFoundException('Proposal not found');
    const summary = await this.aiService.summarise(proposal.title, proposal.description ?? '');
    return { summary };
  }

  @Post('rewrite')
  async rewrite(@Body() body: { proposal_id: string }): Promise<{ rewritten: string }> {
    const proposal = await this.proposalRepo.findOne({ where: { id: body.proposal_id } });
    if (!proposal) throw new NotFoundException('Proposal not found');
    const rewritten = await this.aiService.rewrite(proposal.title, proposal.description ?? '');
    return { rewritten };
  }

  @Post('cluster-arguments')
  async clusterArguments(@Body() body: { proposal_id: string }): Promise<{ clusters: import('./ai.service').ArgumentCluster[] }> {
    const args = await this.argumentRepo.find({ where: { proposal_id: body.proposal_id } });
    const forArgs = args.filter((a) => a.side === 'for').map((a) => a.body);
    const againstArgs = args.filter((a) => a.side === 'against').map((a) => a.body);
    const clusters = await this.aiService.clusterArguments(forArgs, againstArgs);
    return { clusters };
  }

  @Post('draft-proposal')
  async draftProposal(@Body() body: { description: string }): Promise<ProposalDraft> {
    if (!body.description?.trim()) throw new NotFoundException('Description is required');
    return this.aiService.draftProposal(body.description);
  }

  @Post('interpret-vote')
  async interpretVote(@Body() body: { proposal_id: string; input: string }): Promise<InterpretedVote> {
    const proposal = await this.proposalRepo.findOne({ where: { id: body.proposal_id } });
    if (!proposal) throw new NotFoundException('Proposal not found');
    return this.aiService.interpretVote(proposal.title, proposal.description ?? '', body.input);
  }
}
