import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ProposalsService } from './proposals.service';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';

@Controller('proposals')
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get()
  findAll() {
    return this.proposalsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.proposalsService.findOne(id);
  }

  @Get(':id/tally')
  tally(@Param('id') id: string) {
    return this.proposalsService.tally(id);
  }

  @Get(':id/my-delegation-vote')
  @UseGuards(AuthGuard)
  myDelegationVote(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.proposalsService.getMyDelegationVote(id, req.user!.id);
  }

  @Get(':id/my-delegation-chain')
  @UseGuards(AuthGuard)
  myDelegationChain(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.proposalsService.getMyDelegationChain(id, req.user!.id);
  }

  @Get(':id/versions')
  listVersions(@Param('id') id: string) {
    return this.proposalsService.listVersions(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Body() body: { id: string; organisation_id: string; topic_id: string; title: string; description?: string; closes_at?: string | null; deliberation_ends_at?: string | null; threshold?: number; quorum?: number | null; quorum_type?: 'soft' | 'hard'; status?: 'open' | 'draft'; proposal_type?: 'standard' | 'discussion' | 'multiple_choice' },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.proposalsService.create({ ...body, author_id: req.user!.id });
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  edit(
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.proposalsService.edit(id, req.user!.id, body);
  }

  @Post(':id/publish')
  @UseGuards(AuthGuard)
  publish(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.proposalsService.publish(id, req.user!.id);
  }

  @Post(':id/close')
  @UseGuards(AuthGuard)
  close(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.proposalsService.close(id, req.user!.id);
  }

  @Post(':id/reopen')
  @UseGuards(AuthGuard)
  reopen(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.proposalsService.reopen(id, req.user!.id);
  }

  @Post(':id/withdraw')
  @UseGuards(AuthGuard)
  withdraw(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.proposalsService.withdraw(id, req.user!.id);
  }

  @Post(':id/outcome')
  @UseGuards(AuthGuard)
  setOutcome(
    @Param('id') id: string,
    @Body() body: { outcome: 'implemented' | 'not_implemented' | 'in_progress' | null },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.proposalsService.setOutcome(id, req.user!.id, body.outcome);
  }

  @Post(':id/pin')
  @UseGuards(AuthGuard)
  pin(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.proposalsService.setPin(id, req.user!.id, true);
  }

  @Post(':id/unpin')
  @UseGuards(AuthGuard)
  unpin(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.proposalsService.setPin(id, req.user!.id, false);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string) {
    return this.proposalsService.delete(id);
  }

  @Get(':id/reactions')
  listReactions(@Param('id') id: string) {
    return this.proposalsService.listReactions(id);
  }

  @Post(':id/reactions')
  @UseGuards(AuthGuard)
  react(
    @Param('id') id: string,
    @Body() body: { emoji: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.proposalsService.reactToProposal(id, req.user!.id, body.emoji);
  }

  @Delete(':id/reactions')
  @UseGuards(AuthGuard)
  removeReaction(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.proposalsService.removeReaction(id, req.user!.id);
  }

  @Get(':id/options')
  listOptions(@Param('id') id: string) {
    return this.proposalsService.listOptions(id);
  }

  @Post(':id/options')
  @UseGuards(AuthGuard)
  createOption(
    @Param('id') id: string,
    @Body() body: { id: string; text: string; position: number },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.proposalsService.createOption(id, req.user!.id, body);
  }

  @Delete(':id/options/:optionId')
  @UseGuards(AuthGuard)
  deleteOption(
    @Param('optionId') optionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.proposalsService.deleteOption(optionId, req.user!.id);
  }
}
