import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { DelegationsService } from './delegations.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('delegations')
export class DelegationsController {
  constructor(private readonly delegationsService: DelegationsService) {}

  @Get()
  findAll() {
    return this.delegationsService.findAll();
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() body: { id: string; organisation_id: string; delegator_id: string; delegate_id: string; topic_id?: string | null; expires_at?: string | null; fallback_abstain_hours?: number | null }) {
    return this.delegationsService.create(body);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string) {
    return this.delegationsService.delete(id);
  }
}
