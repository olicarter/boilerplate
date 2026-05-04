import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { TopicsService } from './topics.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Get()
  findAll() {
    return this.topicsService.findAll();
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() body: { id: string; name: string; description?: string }) {
    return this.topicsService.create(body);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() body: { name?: string; description?: string }) {
    return this.topicsService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string) {
    return this.topicsService.delete(id);
  }
}
