import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { VotesService } from './votes.service';
import { VoteChoice } from './vote.entity';

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
  create(@Body() body: { id: string; proposal_id: string; user_id: string; choice: VoteChoice }) {
    return this.votesService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { choice: VoteChoice }) {
    return this.votesService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.votesService.delete(id);
  }
}
