/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { Deposit, EventType } from '@prisma/client';
import { ApiConfigService } from '../api-config/api-config.service';
import { BlockOperation } from '../blocks/enums/block-operation';
import { SEND_TRANSACTION_LIMIT_ORE } from '../common/constants';
import { standardizeHash } from '../common/utils/hash';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { UpsertDepositsOperationDto } from './dto/upsert-deposit.dto';
import { EventsService } from './events.service';

@Injectable()
export class DepositsUpsertService {
  constructor(
    private readonly config: ApiConfigService,
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    private readonly users: UsersService,
  ) {}

  async upsertBulk(
    operations: UpsertDepositsOperationDto[],
  ): Promise<Deposit[]> {
    const deposits = new Array<Deposit>();

    for (const operation of operations) {
      const results = await this.upsert(operation);

      for (const result of results) {
        deposits.push(result);
      }
    }

    return deposits;
  }

  async upsert(operation: UpsertDepositsOperationDto): Promise<Deposit[]> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION');

    return this.prisma.$transaction(
      async (prisma) => {
        const deposits = new Array<Deposit>();

        for (const transaction of operation.transactions) {
          const amounts = new Map<string, number>();

          for (const deposit of transaction.notes) {
            const amount = amounts.get(deposit.memo) ?? 0;
            amounts.set(deposit.memo, amount + deposit.amount);
          }

          for (const [graffiti, amount] of amounts) {
            const depositParams = {
              transaction_hash: standardizeHash(transaction.hash),
              block_hash: standardizeHash(operation.block.hash),
              block_sequence: operation.block.sequence,
              network_version: networkVersion,
              graffiti: graffiti,
              main: operation.type === BlockOperation.CONNECTED,
              amount: amount,
            };

            const deposit = await prisma.deposit.upsert({
              create: depositParams,
              update: depositParams,
              where: {
                uq_deposits_on_transaction_hash_and_graffiti: {
                  transaction_hash: depositParams.transaction_hash,
                  graffiti: depositParams.graffiti,
                },
              },
            });

            deposits.push(deposit);

            if (!deposit.main) {
              const event = await prisma.event.findUnique({
                where: {
                  deposit_id: deposit.id,
                },
              });
              if (event) {
                await this.events.deleteWithClient(event, prisma);
              }
            }

            if (deposit.main && deposit.amount >= SEND_TRANSACTION_LIMIT_ORE) {
              const user = await this.users.findByGraffiti(deposit.graffiti);

              if (user) {
                await this.events.createWithClient(
                  {
                    occurredAt: operation.block.timestamp,
                    type: EventType.SEND_TRANSACTION,
                    userId: user.id,
                    deposit: deposit,
                  },
                  prisma,
                );
              }
            }
          }
        }

        const headHash =
          operation.type === BlockOperation.CONNECTED
            ? operation.block.hash
            : operation.block.previousBlockHash;

        const depositHeadParams = {
          id: 1,
          block_hash: headHash,
        };

        await prisma.depositHead.upsert({
          create: depositHeadParams,
          update: depositHeadParams,
          where: { id: 1 },
        });

        return deposits;
      },
      { timeout: 20000 },
    );
  }
}
