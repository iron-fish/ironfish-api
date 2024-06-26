/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { MS_PER_DAY } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteFaucetTransactionOptions } from './interfaces/complete-faucet-transaction-options';
import { CreateFaucetTransactionOptions } from './interfaces/create-faucet-transaction-options';
import { FaucetTransactionsStatus } from './interfaces/faucet-transactions-status';
import { NextFaucetTransactionsOptions } from './interfaces/next-faucet-transactions-options';
import { FaucetTransaction, Prisma } from '.prisma/client';

export const FAUCET_REQUESTS_LIMIT = 2;
export const FAUCET_TIME_LIMIT_MS = 3 * MS_PER_DAY;

@Injectable()
export class FaucetTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrThrow(id: number): Promise<FaucetTransaction> {
    const record = await this.prisma.faucetTransaction.findUnique({
      where: {
        id,
      },
    });
    if (!record) {
      throw new NotFoundException();
    }
    return record;
  }

  async create({
    email,
    publicKey,
    createdAt,
  }: CreateFaucetTransactionOptions): Promise<FaucetTransaction> {
    return this.prisma.$transaction(async (prisma) => {
      const count = await this.prisma.faucetTransaction.count({
        where: {
          created_at: { gte: new Date(Date.now() - FAUCET_TIME_LIMIT_MS) },
          OR: [
            { email },
            {
              public_key: publicKey,
            },
          ],
        },
      });

      if (count >= FAUCET_REQUESTS_LIMIT) {
        throw new UnprocessableEntityException({
          code: 'faucet_max_requests_reached',
          message: 'Too many faucet requests',
        });
      }

      return prisma.faucetTransaction.create({
        data: {
          created_at: createdAt,
          email,
          public_key: publicKey,
        },
      });
    });
  }

  async next(
    options: NextFaucetTransactionsOptions,
  ): Promise<FaucetTransaction[]> {
    const count = options.count ?? 1;
    const currentlyRunningFaucetTransactions =
      await this.prisma.faucetTransaction.findMany({
        where: {
          started_at: {
            not: null,
          },
          completed_at: null,
        },
        orderBy: {
          created_at: Prisma.SortOrder.asc,
        },
        take: count,
      });

    if (currentlyRunningFaucetTransactions.length < count) {
      const diff = count - currentlyRunningFaucetTransactions.length;
      const unfulfilledFaucetTransactions =
        await this.prisma.faucetTransaction.findMany({
          where: {
            started_at: null,
            completed_at: null,
          },
          orderBy: {
            created_at: Prisma.SortOrder.asc,
          },
          take: diff,
        });
      return [
        ...currentlyRunningFaucetTransactions,
        ...unfulfilledFaucetTransactions,
      ];
    }

    return currentlyRunningFaucetTransactions;
  }

  async start(
    faucetTransaction: FaucetTransaction,
  ): Promise<FaucetTransaction> {
    if (faucetTransaction.completed_at) {
      throw new UnprocessableEntityException();
    }
    return this.prisma.$transaction(async (prisma) => {
      return prisma.faucetTransaction.update({
        data: {
          started_at: new Date().toISOString(),
          tries: {
            increment: 1,
          },
        },
        where: {
          id: faucetTransaction.id,
        },
      });
    });
  }

  async complete(
    faucetTransaction: FaucetTransaction,
    options?: CompleteFaucetTransactionOptions,
  ): Promise<FaucetTransaction> {
    if (faucetTransaction.completed_at) {
      throw new UnprocessableEntityException();
    }
    return this.prisma.$transaction(async (prisma) => {
      return prisma.faucetTransaction.update({
        data: {
          completed_at: new Date().toISOString(),
          hash: options?.hash,
        },
        where: {
          id: faucetTransaction.id,
        },
      });
    });
  }

  async getGlobalStatus(): Promise<FaucetTransactionsStatus> {
    const pending = await this.prisma.readClient.faucetTransaction.count({
      where: {
        started_at: null,
        completed_at: null,
      },
    });

    const running = await this.prisma.readClient.faucetTransaction.count({
      where: {
        started_at: {
          not: null,
        },
        completed_at: null,
      },
    });

    const completed = await this.prisma.readClient.faucetTransaction.count({
      where: {
        completed_at: {
          not: null,
        },
      },
    });

    return {
      completed,
      running,
      pending,
    };
  }
}
