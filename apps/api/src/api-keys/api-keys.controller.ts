import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';

@Controller('orgs/:slug/api-keys')
@UseGuards(AuthGuard)
export class ApiKeysController {
  constructor(private readonly service: ApiKeysService) {}

  @Get()
  list(@Param('slug') slug: string, @Req() req: AuthenticatedRequest) {
    return this.service.list(slug, req.user!.id);
  }

  @Post()
  create(
    @Param('slug') slug: string,
    @Body() body: { name: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.create(slug, req.user!.id, body.name);
  }

  @Delete(':keyId')
  revoke(
    @Param('slug') slug: string,
    @Param('keyId') keyId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.revoke(slug, keyId, req.user!.id);
  }
}
