import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TopicsService } from './topics.service';

@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Get()
  findAll() {
    return this.topicsService.findAll();
  }

  @Post()
  create(@Body() body: { id: string; name: string; description?: string }) {
    return this.topicsService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; description?: string }) {
    return this.topicsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.topicsService.delete(id);
  }
}
