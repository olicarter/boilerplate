import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ProposalsService } from './proposals.service';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';

@Controller('proposals')
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get()
  findAll(
    @Query('org') organisation_id?: string,
    @Query('status') status?: string,
    @Query('topic_id') topic_id?: string,
    @Query('author_id') author_id?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    if (page !== undefined || pageSize !== undefined || status || topic_id || author_id || sort) {
      return this.proposalsService.findPaginated({
        organisation_id,
        status,
        topic_id,
        author_id,
        sort,
        page: page ? parseInt(page, 10) : undefined,
        pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      });
    }
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

  @Get(':id/embed')
  async embed(@Param('id') id: string) {
    return this.proposalsService.getEmbedData(id);
  }

  @Get(':id/og-image')
  async ogImage(@Param('id') id: string, @Res() res: Response) {
    const svg = await this.proposalsService.getOgImage(id);
    if (!svg) { res.status(404).send('Not found'); return; }
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(svg);
  }

  @Get(':id/tally/csv')
  @UseGuards(AuthGuard)
  async tallyCsv(@Param('id') id: string, @Res() res: Response) {
    const csv = await this.proposalsService.exportVotesCsv(id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="votes-${id}.csv"`);
    res.send(csv);
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

  @Post('import')
  @UseGuards(AuthGuard)
  bulkImport(
    @Body() body: { org_slug: string; proposals: Array<{ title: string; description?: string; topic_id: string; closes_at?: string; status?: 'open' | 'draft'; tags?: string[] }> },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.proposalsService.bulkImport(body.org_slug, req.user!.id, body.proposals);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Body() body: { id: string; organisation_id: string; topic_id: string; title: string; description?: string; closes_at?: string | null; opens_at?: string | null; deliberation_ends_at?: string | null; threshold?: number; quorum?: number | null; quorum_type?: 'soft' | 'hard'; status?: 'open' | 'draft'; proposal_type?: 'standard' | 'discussion' | 'multiple_choice' | 'temperature_check' | 'consent' | 'approval' | 'score_voting' | 'ranked_choice' | 'petition' | 'amendment'; tags?: string[]; impact_level?: 'low' | 'medium' | 'high' | 'constitutional' | null; signature_threshold?: number | null; parent_proposal_id?: string | null; amendment_text?: string | null; anonymous_voting?: boolean; conviction_voting?: boolean; quadratic_voting?: boolean },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.proposalsService.create({ ...body, author_id: req.user!.id });
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  edit(
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string; tags?: string[] },
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

  @Post(':id/vote-reminder')
  @UseGuards(AuthGuard)
  sendVoteReminder(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.proposalsService.sendVoteReminder(id, req.user!.id);
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

  @Get(':id/jury')
  getJury(@Param('id') id: string) {
    return this.proposalsService.getJury(id);
  }

  @Post(':id/jury')
  @UseGuards(AuthGuard)
  selectJury(
    @Param('id') id: string,
    @Body() body: { size: number },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.proposalsService.selectJury(id, req.user!.id, body.size);
  }

  @Get(':id/carrying')
  getVoteCarrying(@Param('id') id: string) {
    return this.proposalsService.getVoteCarrying(id);
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

  @Get(':id/signatures')
  listSignatures(@Param('id') id: string) {
    return this.proposalsService.listSignatures(id);
  }

  @Post(':id/signatures')
  @UseGuards(AuthGuard)
  sign(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.proposalsService.sign(id, req.user!.id);
  }

  @Delete(':id/signatures')
  @UseGuards(AuthGuard)
  unsign(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.proposalsService.unsign(id, req.user!.id);
  }

  @Get(':id/links')
  listLinks(@Param('id') id: string) {
    return this.proposalsService.listLinks(id);
  }

  @Post(':id/links')
  @UseGuards(AuthGuard)
  addLink(
    @Param('id') id: string,
    @Body() body: { target_proposal_id: string; link_type: 'supersedes' | 'related_to' | 'blocks' | 'depends_on' },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.proposalsService.addLink(id, req.user!.id, body);
  }

  @Delete(':id/links/:linkId')
  @UseGuards(AuthGuard)
  removeLink(@Param('linkId') linkId: string, @Req() req: AuthenticatedRequest) {
    return this.proposalsService.removeLink(linkId, req.user!.id);
  }

  @Get(':id/receipt')
  @UseGuards(AuthGuard)
  getReceipt(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.proposalsService.getVoteReceipt(id, req.user!.id);
  }

  @Get(':id/constitutional-outcome')
  getConstitutionalOutcome(@Param('id') id: string) {
    return this.proposalsService.getConstitutionalOutcome(id);
  }

  @Get(':id/watch')
  @UseGuards(AuthGuard)
  async getWatchStatus(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const watching = await this.proposalsService.isWatching(id, req.user!.id);
    return { watching };
  }

  @Put(':id/watch')
  @UseGuards(AuthGuard)
  watchProposal(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.proposalsService.watchProposal(id, req.user!.id);
  }

  @Delete(':id/watch')
  @UseGuards(AuthGuard)
  unwatchProposal(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.proposalsService.unwatchProposal(id, req.user!.id);
  }

  @Get(':id/boosts')
  @UseGuards(AuthGuard)
  getBoosts(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.proposalsService.getBoostsForUser(id, req.user!.id);
  }

  @Post(':id/boost')
  @UseGuards(AuthGuard)
  boost(@Param('id') id: string, @Body() body: { amount?: number }, @Req() req: AuthenticatedRequest) {
    return this.proposalsService.boost(id, req.user!.id, body.amount ?? 1);
  }

  @Delete(':id/boost')
  @UseGuards(AuthGuard)
  unboost(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.proposalsService.unboost(id, req.user!.id);
  }

  @Get(':id/predictions')
  @UseGuards(AuthGuard)
  getPredictions(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.proposalsService.getPredictions(id, req.user?.id ?? null);
  }

  @Post(':id/predict')
  @UseGuards(AuthGuard)
  predict(
    @Param('id') id: string,
    @Body() body: { prediction: 'pass' | 'fail'; confidence: number },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.proposalsService.predict(id, req.user!.id, body.prediction, body.confidence ?? 50);
  }

  @Delete(':id/predict')
  @UseGuards(AuthGuard)
  unpredict(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.proposalsService.unpredict(id, req.user!.id);
  }
}
