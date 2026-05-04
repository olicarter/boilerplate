import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ProposalsService } from './proposals.service';
import { AuthGuard } from '../auth/auth.guard';

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

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() body: { id: string; topic_id: string; title: string; description?: string }) {
    return this.proposalsService.create(body);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string; status?: 'open' | 'closed'; closed_at?: string | null },
  ) {
    return this.proposalsService.update(id, body as any);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string) {
    return this.proposalsService.delete(id);
  }
}
