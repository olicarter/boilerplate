import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { TopicsService } from './topics.service';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';

@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Get()
  findAll() {
    return this.topicsService.findAll();
  }

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Body() body: { id: string; organisation_id: string; name: string; description?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.topicsService.create(body, req.user!.id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() body: { name?: string; description?: string; is_constitutional?: boolean }, @Req() req: AuthenticatedRequest) {
    return this.topicsService.update(id, body, req.user!.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.topicsService.delete(id, req.user!.id);
  }
}
