/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { EventType, MaspTransaction, User } from '@prisma/client';
import assert from 'assert';
import { ApiConfigService } from '../api-config/api-config.service';
import { BlockOperation } from '../blocks/enums/block-operation';
import { POINTS_PER_CATEGORY } from '../common/constants';
import { standardizeHash } from '../common/utils/hash';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { MaspTransactionHeadService } from '../masp-transaction-head/masp-transaction-head.service';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { UsersService } from '../users/users.service';
import { UpsertMaspTransactionsOperationDto } from './dto/upsert-masp.dto';
import { EventsService } from './events.service';

@Injectable()
export class MaspTransactionsUpsertService {
  constructor(
    private readonly config: ApiConfigService,
    private readonly maspTransactionHeadService: MaspTransactionHeadService,
    private readonly eventsService: EventsService,
    private readonly graphileWorkerService: GraphileWorkerService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async bulkUpsert(
    operations: UpsertMaspTransactionsOperationDto[],
  ): Promise<void> {
    for (const operation of operations) {
      // We only want to handle masp transactions that deal with the main chain
      // (not forks). This will only be connected and disconnected events
      const shouldUpsertMaspTransactions =
        operation.type === BlockOperation.CONNECTED ||
        operation.type === BlockOperation.DISCONNECTED;

      if (shouldUpsertMaspTransactions) {
        await this.graphileWorkerService.addJob<UpsertMaspTransactionsOperationDto>(
          GraphileWorkerPattern.UPSERT_MASP_TRANSACTION,
          operation,
          {
            jobKey: `upsert_masp:${operation.block.hash}:${operation.type}`,
            queueName: 'upsert_masp',
          },
        );
      }
    }
  }

  async upsert(
    operation: UpsertMaspTransactionsOperationDto,
  ): Promise<MaspTransaction[]> {
    const [maspTransactions, users] = await this.prisma.$transaction((client) =>
      this.upsertWithClient(client, operation),
    );
    for (const maspTransaction of maspTransactions) {
      const user = users.get(maspTransaction.asset_name);
      assert(user);
      await this.eventsService.addUpdateLatestPointsJob(
        user.id,
        maspTransaction.type,
      );
    }
    return maspTransactions;
  }

  async upsertWithClient(
    prisma: BasePrismaClient,
    operation: UpsertMaspTransactionsOperationDto,
  ): Promise<[MaspTransaction[], Map<string, User>]> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION');
    const blockHash = standardizeHash(operation.block.hash);

    const shouldUpsertMaspTransactions =
      operation.type === BlockOperation.CONNECTED ||
      operation.type === BlockOperation.DISCONNECTED;

    let maspTransactions = new Array<MaspTransaction>();

    const userGraffitis = operation.transactions.flatMap((transaction) =>
      transaction.notes.map((note) => note.assetName),
    );
    const users = await this.usersService.findManyAndMapByGraffiti(
      userGraffitis,
    );
    if (shouldUpsertMaspTransactions) {
      if (operation.type === BlockOperation.CONNECTED) {
        // Create masp transaction params
        const maspTransactionParams = new Array<{
          transaction_hash: string;
          block_hash: string;
          block_sequence: number;
          network_version: number;
          type: EventType;
          asset_name: string;
          main: boolean;
        }>();
        for (const transaction of operation.transactions) {
          for (const note of transaction.notes) {
            // Masp assetName should match user grafitti
            if (!users.has(note.assetName)) {
              continue;
            }

            maspTransactionParams.push({
              asset_name: note.assetName,
              type: note.type,
              transaction_hash: standardizeHash(transaction.hash),
              block_hash: blockHash,
              block_sequence: operation.block.sequence,
              main: true,
              network_version: networkVersion,
            });
          }
        }

        // Now create new not existing masp transactions
        await prisma.maspTransaction.createMany({
          data: maspTransactionParams,
          skipDuplicates: true,
        });

        maspTransactions = await prisma.maspTransaction.findMany({
          where: {
            block_hash: blockHash,
            network_version: networkVersion,
          },
        });

        const eventPayloads = maspTransactions.map((maspTransaction) => {
          const user = users.get(maspTransaction.asset_name);
          assert(user);

          return {
            occurred_at: operation.block.timestamp.toISOString(),
            type: maspTransaction.type,
            user_id: user.id,
            points: POINTS_PER_CATEGORY[maspTransaction.type],
            masp_transaction_id: maspTransaction.id,
          };
        });

        await prisma.event.createMany({
          data: eventPayloads,
          skipDuplicates: true,
        });
      }

      if (operation.type === BlockOperation.DISCONNECTED) {
        await prisma.maspTransaction.updateMany({
          data: {
            main: false,
          },
          where: {
            block_hash: blockHash,
            network_version: networkVersion,
          },
        });

        maspTransactions = await prisma.maspTransaction.findMany({
          where: {
            block_hash: blockHash,
            network_version: networkVersion,
          },
        });

        await prisma.event.deleteMany({
          where: {
            masp_transaction_id: {
              in: maspTransactions.map((maspTransaction) => maspTransaction.id),
            },
          },
        });
      }
    }

    const headHash =
      operation.type === BlockOperation.CONNECTED
        ? standardizeHash(operation.block.hash)
        : standardizeHash(operation.block.previousBlockHash);

    await this.maspTransactionHeadService.upsert(headHash);

    return [maspTransactions, users];
  }
}
