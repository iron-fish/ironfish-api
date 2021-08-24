/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { BaseContext } from '../interfaces/base-context';

export const Context = createParamDecorator(
  (_data: unknown, context: ExecutionContext): BaseContext => {
    const request = context.switchToHttp().getRequest<Request>();
    return request.context;
  },
);
