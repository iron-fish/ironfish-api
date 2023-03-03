/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { JumioCallbackData } from './interfaces/jumio-callback-data';
import { JumioCallback, JumioTransaction } from '.prisma/client';

@Injectable()
export class CallbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(request: JumioCallbackData): Promise<JumioCallback> {
    return this.prisma.jumioCallback.create({
      data: {
        request: instanceToPlain(request),
      },
    });
  }

  async udpate(
    callback: JumioCallback,
    transaction: JumioTransaction,
  ): Promise<JumioCallback> {
    return this.prisma.jumioCallback.update({
      data: {
        jumio_transaction_id: transaction.id,
      },
      where: {
        id: callback.id,
      },
    });
  }
}
