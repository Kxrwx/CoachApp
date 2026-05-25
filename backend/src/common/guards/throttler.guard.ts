import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Utiliser l'IP de l'utilisateur comme tracker
    return req.ip || req.connection.remoteAddress;
  }
}
