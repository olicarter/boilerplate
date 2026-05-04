import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.is('application/octet-stream') || req.path.includes('yjs-update')) {
      let data: Uint8Array[] = [];

      req.on('data', (chunk: Buffer) => {
        data.push(chunk);
      });

      req.on('end', () => {
        req.body = Buffer.concat(data);
        next();
      });

      req.on('error', (err: Error) => {
        next(err);
      });
    } else {
      next();
    }
  }
}