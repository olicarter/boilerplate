import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { VotesService } from './votes.service';
import { VoteChoice } from './vote.entity';
import { AuthGuard } from '../auth/auth.guard';

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
  create(@Body() body: { id: string; proposal_id: string; user_id: string; choice?: VoteChoice | null; option_id?: string | null }) {
    return this.votesService.create(body);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() body: { choice?: VoteChoice | null; option_id?: string | null }) {
    return this.votesService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string) {
    return this.votesService.delete(id);
  }
}
