import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
import { AuthService } from './auth.service';

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

  @Post('logout')
  logout(@Req() req: Request) {
    return this.authService.logout(req);
  }
}
