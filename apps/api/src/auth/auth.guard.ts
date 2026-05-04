import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

declare module 'express-session' {
  interface Session {
    userId?: string;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.session?.userId;

    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    request.user = { id: userId };
    return true;
  }
}