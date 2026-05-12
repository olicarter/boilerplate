import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() body: { id: string; name: string; email: string }) {
    return this.usersService.create(body);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() body: { name?: string; email?: string; bio?: string | null; avatar_url?: string | null }) {
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string) {
    return this.usersService.delete(id);
  }

  @Get('me/notification-preferences')
  @UseGuards(AuthGuard)
  getNotificationPreferences(@Req() req: AuthenticatedRequest) {
    return this.usersService.getNotificationPreferences(req.user!.id);
  }

  @Patch('me/notification-preferences')
  @UseGuards(AuthGuard)
  updateNotificationPreferences(
    @Req() req: AuthenticatedRequest,
    @Body() body: Record<string, boolean>,
  ) {
    return this.usersService.updateNotificationPreferences(req.user!.id, body);
  }

  @Get('me/org-email-preferences')
  @UseGuards(AuthGuard)
  getOrgEmailPreferences(@Req() req: AuthenticatedRequest) {
    return this.usersService.getOrgEmailPreferences(req.user!.id);
  }
}
