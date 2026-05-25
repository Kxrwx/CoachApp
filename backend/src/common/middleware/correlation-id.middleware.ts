import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'nestjs-pino';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Génère ou récupère le correlation ID
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();

    // Injecte dans la request pour accès plus tard
    req.id = correlationId;

    // Ajoute aux headers de réponse
    res.setHeader('x-correlation-id', correlationId);

    // Ajoute au contexte de logging si logger disponible
    if (req.log) {
      req.log = req.log.child({ correlationId });
    }

    // Log la requête entrante
    if (req.log) {
      req.log.info(
        {
          method: req.method,
          path: req.path,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
        'Request received'
      );
    }

    // Hook pour logger la réponse
    const startTime = Date.now();
    const originalSend = res.send;

    res.send = function (data) {
      const duration = Date.now() - startTime;

      if (req.log) {
        req.log.info(
          {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            contentLength: res.get('content-length'),
          },
          'Request completed'
        );
      }

      return originalSend.call(this, data);
    };

    next();
  }
}

// Extend Express Request avec correlation ID
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}
