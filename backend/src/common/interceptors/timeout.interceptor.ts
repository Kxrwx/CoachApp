import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  // Timeouts par endpoint (ms)
  private readonly ROUTE_TIMEOUTS: Record<string, number> = {
    // Strava sync: peut prendre du temps
    'POST /strava/link': 30000,
    'POST /strava/sync': 30000,
    'POST /upload': 30000,

    // Par défaut: 15s pour les autres requêtes
    'default': 15000,
  };

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const key = `${request.method} ${request.path}`;
    const timeoutMs = this.ROUTE_TIMEOUTS[key] || this.ROUTE_TIMEOUTS['default'];

    return next.handle().pipe(
      timeout(timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          // Log le timeout
          const log = request.log || console;
          log.warn(
            {
              route: key,
              timeout: timeoutMs,
              correlationId: request.id,
            },
            'Request timeout'
          );

          return throwError(
            () =>
              new RequestTimeoutException(
                `Request timeout after ${timeoutMs}ms for ${key}`
              )
          );
        }
        return throwError(() => err);
      })
    );
  }
}
