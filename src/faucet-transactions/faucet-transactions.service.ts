/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFaucetTransactionOptions } from './interfaces/create-faucet-transaction-options';
import { FaucetTransaction } from '.prisma/client';

@Injectable()
export class FaucetTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create({
    email,
    publicKey,
  }: CreateFaucetTransactionOptions): Promise<FaucetTransaction> {
    return this.prisma.$transaction(async (prisma) => {
      return prisma.faucetTransaction.create({
        data: {
          email,
          public_key: publicKey,
        },
      });
    });
  }
}
