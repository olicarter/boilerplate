import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { DelegationsService } from './delegations.service';

@Controller('delegations')
export class DelegationsController {
  constructor(private readonly delegationsService: DelegationsService) {}

  @Get()
  findAll() {
    return this.delegationsService.findAll();
  }

  @Post()
  create(@Body() body: { id: string; delegator_id: string; delegate_id: string; topic_id?: string | null }) {
    return this.delegationsService.create(body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.delegationsService.delete(id);
  }
}
