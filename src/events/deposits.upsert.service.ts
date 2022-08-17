/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { Deposit, EventType, Prisma } from '@prisma/client';
import is from '@sindresorhus/is';
import assert from 'assert';
import { ApiConfigService } from '../api-config/api-config.service';
import { BlocksService } from '../blocks/blocks.service';
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
    private readonly blocksService: BlocksService,
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
            queueName: 'upsert_deposit',
          },
        );
      }
    }
  }

  async upsert(operation: UpsertDepositsOperationDto): Promise<Deposit[]> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION');
    const deposits = new Array<Deposit>();
    const blockHash = standardizeHash(operation.block.hash);

    for (const transaction of operation.transactions) {
      const transactionHash = standardizeHash(transaction.hash);

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
            transaction_hash: transactionHash,
            block_hash: blockHash,
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

          await this.processDeposit(prisma, deposit, operation.block.timestamp);
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

  async processDeposit(
    prisma: Prisma.TransactionClient,
    deposit: Deposit,
    blockTimestamp: Date | null,
  ): Promise<void> {
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
        assert.ok(blockTimestamp);

        await this.eventsService.createWithClient(
          {
            occurredAt: blockTimestamp,
            type: EventType.SEND_TRANSACTION,
            userId: user.id,
            deposit,
          },
          prisma,
        );
      }
    }
  }

  async mismatchedDepositCount(beforeSequence = 0): Promise<number> {
    const blocksHead = await this.blocksService.head();

    const result = await this.prisma.$queryRawUnsafe<{ count: BigInt }[]>(
      `
      SELECT
        COUNT(*)
      FROM
        deposits
      LEFT JOIN
        blocks
      ON blocks.hash = deposits.block_hash
      WHERE
        (blocks.hash IS NULL AND deposits.main) OR
        blocks.main <> deposits.main AND
        deposits.block_sequence <= ${blocksHead.sequence - beforeSequence}
      `,
    );
    if (!is.array(result) || result.length !== 1 || !is.object(result[0])) {
      throw new Error('Unexpected database response');
    }
    return Number(result[0].count);
  }

  async mismatchedDeposits(
    beforeSequence = 0,
  ): Promise<
    (Deposit & { block_main: boolean | null; block_timestamp: Date | null })[]
  > {
    const blocksHead = await this.blocksService.head();

    const results = await this.prisma.$queryRawUnsafe<
      (Deposit & {
        block_main: boolean | null;
        block_timestamp: string | null;
      })[]
    >(
      `
      SELECT
        deposits.*,
        blocks.main AS block_main,
        blocks.timestamp AS block_timestamp
      FROM
        deposits
      LEFT JOIN
        blocks
      ON blocks.hash = deposits.block_hash
      WHERE
        (blocks.hash IS NULL AND deposits.main) OR
        blocks.main <> deposits.main AND
        deposits.block_sequence <= ${blocksHead.sequence - beforeSequence}
      LIMIT 50000
      `,
    );

    // results of raw queries are not subject to prisma type conversions, and
    // dates are returned as strings
    return results.map((r) => ({
      ...r,
      created_at: new Date(r.created_at),
      updated_at: new Date(r.updated_at),
      block_timestamp: r.block_timestamp ? new Date(r.block_timestamp) : null,
    }));
  }

  async refreshDeposits(): Promise<void> {
    const refreshDepositQueues = 4;
    const mismatchedDeposits = await this.mismatchedDeposits(50);

    let queueNumber = 0;
    for (const deposit of mismatchedDeposits) {
      await this.graphileWorkerService.addJob(
        GraphileWorkerPattern.REFRESH_DEPOSIT,
        deposit,
        {
          queueName: `refresh_deposit_${queueNumber}`,
        },
      );
      queueNumber = (queueNumber + 1) % refreshDepositQueues;
    }
  }

  async refreshDeposit(
    mismatchedDeposit: Deposit & {
      block_main: boolean | null;
      block_timestamp: Date | null;
    },
  ): Promise<void> {
    await this.prisma.$transaction(async (prisma) => {
      const updatedDeposit = await this.prisma.deposit.update({
        data: {
          main: mismatchedDeposit.block_main ?? false,
        },
        where: {
          id: mismatchedDeposit.id,
        },
      });

      await this.processDeposit(
        prisma,
        updatedDeposit,
        mismatchedDeposit.block_timestamp,
      );
    });
  }
}
