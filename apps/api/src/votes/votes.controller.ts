import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { VotesService } from './votes.service';
import { VoteChoice } from './vote.entity';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';

@Controller('votes')
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @Get()
  findAll() {
    return this.votesService.findAll();
  }

  @Get('proposal/:proposalId')
  findByProposal(@Param('proposalId') proposalId: string) {
    return this.votesService.findByProposal(proposalId);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() body: { id: string; proposal_id: string; user_id: string; choice?: VoteChoice | null; option_id?: string | null; reason?: string | null; vote_count?: number }) {
    return this.votesService.create(body);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() body: { choice?: VoteChoice | null; option_id?: string | null; reason?: string | null }) {
    return this.votesService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string) {
    return this.votesService.delete(id);
  }

  @Post('proposals/:proposalId/approvals')
  @UseGuards(AuthGuard)
  setApprovals(
    @Param('proposalId') proposalId: string,
    @Body() body: { option_ids: string[] },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.votesService.setApprovals(proposalId, req.user!.id, body.option_ids);
  }

  @Post('proposals/:proposalId/scores')
  @UseGuards(AuthGuard)
  setScores(
    @Param('proposalId') proposalId: string,
    @Body() body: { scores: Array<{ option_id: string; score: number }> },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.votesService.setScores(proposalId, req.user!.id, body.scores);
  }

  @Post('proposals/:proposalId/rankings')
  @UseGuards(AuthGuard)
  setRankings(
    @Param('proposalId') proposalId: string,
    @Body() body: { option_ids: string[] },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.votesService.setRankings(proposalId, req.user!.id, body.option_ids);
  }
}
