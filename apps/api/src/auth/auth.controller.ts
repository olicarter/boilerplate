import { Body, Controller, Delete, ForbiddenException, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
import { AuthService } from './auth.service';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/begin')
  registerBegin(@Body() body: { name: string; email: string }) {
    return this.authService.registerBegin(body);
  }

  @Post('register/finish')
  registerFinish(@Body() body: RegistrationResponseJSON, @Req() req: Request) {
    return this.authService.registerFinish(body, req);
  }

  @Post('login/begin')
  loginBegin() {
    return this.authService.loginBegin();
  }

  @Post('login/finish')
  loginFinish(@Body() body: AuthenticationResponseJSON, @Req() req: Request) {
    return this.authService.loginFinish(body, req);
  }

  @UseGuards(AuthGuard)
  @Get('passkeys')
  listPasskeys(@Req() req: AuthenticatedRequest) {
    return this.authService.listPasskeys(req.user!.id);
  }

  @UseGuards(AuthGuard)
  @Post('add-passkey/begin')
  addPasskeyBegin(@Req() req: AuthenticatedRequest) {
    return this.authService.addPasskeyBegin(req.user!.id);
  }

  @UseGuards(AuthGuard)
  @Post('add-passkey/finish')
  addPasskeyFinish(@Body() body: RegistrationResponseJSON, @Req() req: AuthenticatedRequest) {
    return this.authService.addPasskeyFinish(body, req.user!.id);
  }

  @UseGuards(AuthGuard)
  @Delete('passkeys/:id')
  deletePasskey(@Param('id') credentialId: string, @Req() req: AuthenticatedRequest) {
    return this.authService.deletePasskey(credentialId, req.user!.id);
  }

  @Post('magic/begin')
  magicLinkBegin(@Body() body: { email: string }) {
    return this.authService.magicLinkBegin(body.email);
  }

  @Post('magic/verify')
  magicLinkVerify(@Query('token') token: string, @Req() req: Request) {
    return this.authService.magicLinkVerify(token, req);
  }

  @Post('verify-email')
  verifyEmail(@Body() body: { token: string }) {
    return this.authService.verifyEmail(body.token);
  }

  @Post('logout')
  logout(@Req() req: Request) {
    return this.authService.logout(req);
  }

  @Post('test-reset')
  testReset() {
    if (process.env.NODE_ENV !== 'test') throw new ForbiddenException();
    return this.authService.testReset();
  }

  @Post('test-setup')
  testSetup(@Body() body: { name: string; email: string }, @Req() req: Request) {
    if (process.env.NODE_ENV !== 'test') throw new ForbiddenException();
    return this.authService.testSetup(body, req);
  }
}
