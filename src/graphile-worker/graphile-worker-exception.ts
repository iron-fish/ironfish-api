/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Catch, RpcExceptionFilter } from '@nestjs/common';
import { Observable } from 'rxjs';

@Catch()
export class GraphileWorkerException implements RpcExceptionFilter<Error> {
  catch(error: Error): Observable<unknown> {
    throw error;
  }
}
