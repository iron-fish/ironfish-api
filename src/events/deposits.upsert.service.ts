/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { Deposit, EventType, Prisma, User } from '@prisma/client';
import is from '@sindresorhus/is';
import assert from 'assert';
import { ApiConfigService } from '../api-config/api-config.service';
import { BlocksService } from '../blocks/blocks.service';
import { BlockOperation } from '../blocks/enums/block-operation';
import {
  ENABLE_DEPOSIT_BLOCK_SEQUENCE,
  ORE_TO_IRON,
  SEND_TRANSACTION_LIMIT_ORE,
} from '../common/constants';
import { standardizeHash } from '../common/utils/hash';
import { DepositHeadsService } from '../deposit-heads/deposit-heads.service';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { InfluxDbService } from '../influxdb/influxdb.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { DepositsService } from './deposits.service';
import { UpsertDepositsOperationDto } from './dto/upsert-deposit.dto';
import { EventsService } from './events.service';

@Injectable()
export class DepositsUpsertService {
  constructor(
    private readonly config: ApiConfigService,
    private readonly depositHeadsService: DepositHeadsService,
    private readonly depositsService: DepositsService,
    private readonly eventsService: EventsService,
    private readonly graphileWorkerService: GraphileWorkerService,
    private readonly influxDbService: InfluxDbService,
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
        await this.upsert(operation);
      }
    }
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
        await this.eventsService.deleteWithClient([event], prisma);
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

  async syncDepositedIron(): Promise<void> {
    const aggregate = await this.prisma.readClient.deposit.aggregate({
      _sum: {
        amount: true,
      },
    });

    this.influxDbService.writePoints([
      {
        measurement: 'deposited_iron',
        fields: [
          {
            name: 'iron',
            type: 'float',
            value: aggregate._sum.amount
              ? aggregate._sum.amount / ORE_TO_IRON
              : 0,
          },
        ],
        tags: [],
        timestamp: new Date(),
      },
    ]);

    const runAt = new Date();
    runAt.setHours(runAt.getHours() + 6);
    await this.graphileWorkerService.addJob(
      GraphileWorkerPattern.SUBMIT_DEPOSITED_IRON_TO_TELEMETRY,
      {},
      { jobKey: 'sync_deposited_iron_to_telemetry', runAt },
    );
  }

  async upsert(operation: UpsertDepositsOperationDto): Promise<Deposit[]> {
    assert(
      operation.block.sequence <= ENABLE_DEPOSIT_BLOCK_SEQUENCE,
      `Deposits not accepted after block ${ENABLE_DEPOSIT_BLOCK_SEQUENCE}`,
    );

    const shouldUpsertDeposit =
      operation.type === BlockOperation.CONNECTED ||
      operation.type === BlockOperation.DISCONNECTED;

    assert(shouldUpsertDeposit, 'FORK not supported');

    const networkVersion = this.config.get<number>('NETWORK_VERSION');

    const blockHash = standardizeHash(operation.block.hash);
    const previousBlockHash = standardizeHash(
      operation.block.previousBlockHash,
    );

    // The type is wrong in the DTO this is a strong
    const blockTimestamp = new Date(operation.block.timestamp);

    const [deposits, users] = await this.prisma.$transaction(
      async (prisma) => {
        const head = await this.depositsService.head();

        let deposits = new Array<Deposit>();
        let users = new Map<string, User>();

        if (operation.type === BlockOperation.CONNECTED) {
          if (head && head.block_hash !== previousBlockHash) {
            throw new Error(
              `Cannot connect block ${blockHash} to ${String(
                head.block_hash,
              )}, expecting ${previousBlockHash}`,
            );
          }

          let depositParams = new Array<{
            transaction_hash: string;
            block_hash: string;
            block_sequence: number;
            network_version: number;
            graffiti: string;
            main: boolean;
            amount: number;
          }>();

          const graffitis = new Array<string>();

          for (const transaction of operation.transactions) {
            const amounts = new Map<string, number>();

            for (const note of transaction.notes) {
              if (note.memo) {
                const amount = amounts.get(note.memo) ?? 0;
                amounts.set(note.memo, amount + note.amount);
              }
            }

            // Create deposit params for each deposit with a matching user
            for (const [graffiti, amount] of amounts) {
              depositParams.push({
                graffiti,
                amount,
                transaction_hash: standardizeHash(transaction.hash),
                block_hash: blockHash,
                block_sequence: operation.block.sequence,
                main: true,
                network_version: networkVersion,
              });

              graffitis.push(graffiti);
            }
          }

          // Bulk load unique users and map by graffiti
          users = await this.usersService.findManyAndMapByGraffiti(graffitis);

          // Filter deposits made by unknown users
          depositParams = depositParams.filter((d) => users.has(d.graffiti));

          // Deposits are shared between blocks, so we need to reassign all the ones on other blocks
          if (depositParams.length) {
            await prisma.deposit.updateMany({
              data: {
                block_hash: blockHash,
                main: true,
              },
              where: {
                OR: depositParams.map((deposit) => ({
                  AND: {
                    transaction_hash: deposit.transaction_hash,
                    graffiti: deposit.graffiti,
                  },
                })),
                network_version: networkVersion,
              },
            });
          }

          // Create new deposits
          await prisma.deposit.createMany({
            data: depositParams,
            skipDuplicates: true,
          });

          deposits = await prisma.deposit.findMany({
            where: {
              block_hash: blockHash,
              network_version: networkVersion,
            },
          });

          const eventPayloads = [];
          const usersFiltered = new Map<string, User>();
          const eventDepositIds = new Array<number>();

          // Create the event payloads filtering events and users on points < 0
          for (const deposit of deposits) {
            const points = this.eventsService.calculateDepositPoints(deposit);

            if (points <= 0) {
              continue;
            }

            const user = users.get(deposit.graffiti);

            // This should NEVER happen but can happen if a user is deleted after they made a deposit
            if (!user) {
              continue;
            }

            usersFiltered.set(deposit.graffiti, user);
            eventDepositIds.push(deposit.id);

            eventPayloads.push({
              occurred_at: blockTimestamp.toISOString(),
              type: EventType.SEND_TRANSACTION,
              user_id: user.id,
              points: points,
              deposit_id: deposit.id,
            });
          }

          users = usersFiltered;

          // This SHOULD NOT be needed but this cleans up bad data in the server and crashes without this
          await prisma.event.deleteMany({
            where: {
              deposit_id: {
                in: eventDepositIds,
              },
            },
          });

          await prisma.event.createMany({
            data: eventPayloads,
          });
        } else if (operation.type === BlockOperation.DISCONNECTED) {
          if (!head || head.block_hash !== operation.block.hash) {
            throw new Error(
              `Cannot disconnect ${blockHash}, expecting ${String(
                head?.block_hash,
              )}`,
            );
          }

          await prisma.deposit.updateMany({
            data: {
              main: false,
            },
            where: {
              block_hash: blockHash,
              network_version: networkVersion,
            },
          });

          deposits = await prisma.deposit.findMany({
            where: {
              block_hash: blockHash,
              network_version: networkVersion,
            },
          });

          await prisma.event.deleteMany({
            where: {
              deposit_id: {
                in: deposits.map((deposit) => deposit.id),
              },
            },
          });

          users = await this.usersService.findManyAndMapByGraffiti(
            deposits.map((d) => d.graffiti),
          );
        }

        const headHash =
          operation.type === BlockOperation.CONNECTED
            ? standardizeHash(operation.block.hash)
            : standardizeHash(operation.block.previousBlockHash);

        await this.depositHeadsService.upsert(headHash);

        return [deposits, users];
      },
      { timeout: 120000 },
    );

    // Recalculate points, this really should be after the transaction commits
    for (const user of users.values()) {
      await this.eventsService.addUpdateLatestPointsJob(
        user.id,
        EventType.SEND_TRANSACTION,
      );
    }

    return deposits;
  }
}
