/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { Deposit, EventType } from '@prisma/client';
import { ApiConfigService } from '../api-config/api-config.service';
import { BlockOperation } from '../blocks/enums/block-operation';
import { SEND_TRANSACTION_LIMIT_ORE } from '../common/constants';
import { standardizeHash } from '../common/utils/hash';
import { DepositHeadsService } from '../deposit-heads/deposit-heads.service';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { UpsertDepositsOperationDto } from './dto/upsert-deposit.dto';
import { EventsService } from './events.service';

@Injectable()
export class DepositsUpsertService {
  constructor(
    private readonly config: ApiConfigService,
    private readonly depositHeadsService: DepositHeadsService,
    private readonly eventsService: EventsService,
    private readonly graphileWorkerService: GraphileWorkerService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async bulkUpsert(operations: UpsertDepositsOperationDto[]): Promise<void> {
    for (const operation of operations) {
      // We only want to handle deposits that deal with the main chain
      // (not forks). This will only be connected and disconnected events
      const shouldUpsertDeposits =
        operation.type === BlockOperation.CONNECTED ||
        operation.type === BlockOperation.DISCONNECTED;

      if (shouldUpsertDeposits) {
        await this.graphileWorkerService.addJob<UpsertDepositsOperationDto>(
          GraphileWorkerPattern.UPSERT_DEPOSIT,
          operation,
          {
            jobKey: `upsert_deposit:${operation.block.hash}:${operation.type}`,
          },
        );
      }
    }
  }

  async upsert(operation: UpsertDepositsOperationDto): Promise<Deposit[]> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION');
    const deposits = new Array<Deposit>();

    for (const transaction of operation.transactions) {
      const shouldUpsertDeposit =
        operation.type === BlockOperation.CONNECTED ||
        operation.type === BlockOperation.DISCONNECTED;
      if (!shouldUpsertDeposit) {
        continue;
      }

      const amounts = new Map<string, number>();

      for (const deposit of transaction.notes) {
        const amount = amounts.get(deposit.memo) ?? 0;
        amounts.set(deposit.memo, amount + deposit.amount);
      }

      for (const [graffiti, amount] of amounts) {
        await this.prisma.$transaction(async (prisma) => {
          const depositParams = {
            transaction_hash: standardizeHash(transaction.hash),
            block_hash: standardizeHash(operation.block.hash),
            block_sequence: operation.block.sequence,
            network_version: networkVersion,
            graffiti,
            main: operation.type === BlockOperation.CONNECTED,
            amount,
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
              await this.eventsService.deleteWithClient(event, prisma);
            }
          }

          if (deposit.main && deposit.amount >= SEND_TRANSACTION_LIMIT_ORE) {
            const user = await this.usersService.findByGraffiti(
              deposit.graffiti,
              prisma,
            );

            if (user) {
              await this.eventsService.createWithClient(
                {
                  occurredAt: operation.block.timestamp,
                  type: EventType.SEND_TRANSACTION,
                  userId: user.id,
                  deposit,
                },
                prisma,
              );
            }
          }
        });
      }

      const headHash =
        operation.type === BlockOperation.CONNECTED
          ? operation.block.hash
          : operation.block.previousBlockHash;
      await this.depositHeadsService.upsert(headHash);
    }

    return deposits;
  }
}
