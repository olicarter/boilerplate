import { Controller, Get, Post, Param, UseGuards, Req, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query('limit') limit?: string) {
    return this.service.listForUser(req.user!.id, limit ? parseInt(limit, 10) : 30);
  }

  @Get('unread-count')
  async unreadCount(@Req() req: AuthenticatedRequest) {
    const count = await this.service.unreadCount(req.user!.id);
    return { count };
  }

  @Post(':id/read')
  markRead(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.service.markRead(id, req.user!.id);
  }

  @Post('read-all')
  markAllRead(@Req() req: AuthenticatedRequest) {
    return this.service.markAllRead(req.user!.id);
  }
}
