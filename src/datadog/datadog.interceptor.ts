/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { DatadogService } from './datadog.service';

@Injectable()
export class DatadogInterceptor implements NestInterceptor {
  constructor(private readonly datadogService: DatadogService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    const start = new Date().getTime();
    return next.handle().pipe(
      tap(() => {
        const duration = new Date().getTime() - start;

        const request = context.switchToHttp().getRequest<Request>();
        if (!request) {
          return;
        }

        this.datadogService.timing('requests.success', duration, {
          method: request.method,
          path: request.path,
        });
      }),
      catchError((error: Error) => {
        let method = 'no-method';
        let path = 'no-path';

        const request = context.switchToHttp().getRequest<Request>();
        if (request) {
          method = request.method;
          path = request.path;
        }

        this.datadogService.increment('requests.error', 1, {
          method,
          path,
          type: error.constructor.name,
        });

        return throwError(() => error);
      }),
    );
  }
}
