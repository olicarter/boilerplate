import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';

@Controller('orgs/:slug/webhooks')
@UseGuards(AuthGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  list(@Param('slug') slug: string, @Req() req: AuthenticatedRequest) {
    return this.webhooksService.listBySlug(slug, req.user!.id);
  }

  @Post()
  create(
    @Param('slug') slug: string,
    @Body() body: { url: string; events: string[] },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.webhooksService.createBySlug(slug, req.user!.id, body.url, body.events ?? []);
  }

  @Delete(':id')
  delete(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.webhooksService.deleteBySlug(id, slug, req.user!.id);
  }
}
