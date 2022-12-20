/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { EventType, Masp, User } from '@prisma/client';
import assert from 'assert';
import { ApiConfigService } from '../api-config/api-config.service';
import { BlockOperation } from '../blocks/enums/block-operation';
import { POINTS_PER_CATEGORY } from '../common/constants';
import { standardizeHash } from '../common/utils/hash';
import { MaspHeadService } from '../masp-transaction-head/masp-transaction-head.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { phase3Week } from '../users/utils/week';
import { UpsertMaspTransactionsOperationDto } from './dto/upsert-masp.dto';
import { EventsService } from './events.service';

@Injectable()
export class MaspUpsertService {
  constructor(
    private readonly config: ApiConfigService,
    private readonly maspHeadService: MaspHeadService,
    private readonly eventsService: EventsService,
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
        await this.upsert(operation);
      }
    }
  }

  async upsert(operation: UpsertMaspTransactionsOperationDto): Promise<Masp[]> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION');
    const blockHash = standardizeHash(operation.block.hash);

    assert(
      operation.type === BlockOperation.CONNECTED ||
        operation.type === BlockOperation.DISCONNECTED,
      'FORK operations not supported',
    );

    if (operation.type === BlockOperation.DISCONNECTED) {
      assert(
        operation.transactions.length === 0,
        'Transactions should not be sent with disconnected blocks',
      );
    }

    const previousBlockHash = standardizeHash(
      operation.block.previousBlockHash,
    );

    const [masps, users] = await this.prisma.$transaction(async (prisma) => {
      let users: Map<string, User>;
      let masps = new Array<Masp>();
      const head = await this.maspHeadService.head();

      if (operation.type === BlockOperation.CONNECTED) {
        const userGraffitis = operation.transactions.reduce<string[]>(
          (acc, transaction) =>
            acc.concat(
              transaction.masps.reduce<string[]>(
                (acc2, masp) => acc2.concat(masp.assetName),
                [],
              ),
            ),
          [],
        );
        users = await this.usersService.findManyAndMapByGraffiti(userGraffitis);
        if (head && head.block_hash !== previousBlockHash) {
          throw new Error(
            `Cannot connect block ${blockHash} to ${String(
              head.block_hash,
            )}, expecting ${previousBlockHash}`,
          );
        }
        // Create masp transaction params
        const maspParams = new Array<{
          transaction_hash: string;
          block_hash: string;
          block_sequence: number;
          network_version: number;
          type: EventType;
          asset_name: string;
          main: boolean;
        }>();
        for (const transaction of operation.transactions) {
          for (const masp of transaction.masps) {
            // Masp assetName should match user grafitti
            if (!users.has(masp.assetName)) {
              continue;
            }

            maspParams.push({
              asset_name: masp.assetName,
              type: masp.type,
              transaction_hash: standardizeHash(transaction.hash),
              block_hash: blockHash,
              block_sequence: operation.block.sequence,
              main: true,
              network_version: networkVersion,
            });
          }
        }
        // MASP transactions are shared between blocks, so we need to reassign all the ones on other blocks
        if (maspParams.length) {
          await prisma.masp.updateMany({
            data: {
              block_hash: blockHash,
              main: true,
            },
            where: {
              OR: maspParams.map((masp) => ({
                AND: {
                  transaction_hash: masp.transaction_hash,
                  asset_name: masp.asset_name,
                  type: masp.type,
                },
              })),
              network_version: networkVersion,
            },
          });
        }
        // Now create new not existing masp transactions
        await prisma.masp.createMany({
          data: maspParams,
          skipDuplicates: true,
        });

        masps = await prisma.masp.findMany({
          where: {
            block_hash: blockHash,
            network_version: networkVersion,
          },
        });
        const currentPhase3Week = phase3Week(operation.block.timestamp);
        const eventPayloads = masps.map((masp) => {
          const user = users.get(masp.asset_name);
          assert(user);

          return {
            occurred_at: operation.block.timestamp.toISOString(),
            type: masp.type,
            user_id: user.id,
            week: currentPhase3Week,
            points: POINTS_PER_CATEGORY[masp.type],
            masp_id: masp.id,
          };
        });

        await prisma.event.createMany({
          data: eventPayloads,
          skipDuplicates: true,
        });
      } else if (operation.type === BlockOperation.DISCONNECTED) {
        if (!head || head.block_hash !== operation.block.hash) {
          throw new Error(
            `Cannot disconnect ${blockHash}, expecting ${String(
              head?.block_hash,
            )}`,
          );
        }
        await prisma.masp.updateMany({
          data: {
            main: false,
          },
          where: {
            block_hash: blockHash,
            network_version: networkVersion,
          },
        });

        masps = await prisma.masp.findMany({
          where: {
            block_hash: blockHash,
            network_version: networkVersion,
          },
        });
        users = await this.usersService.findManyAndMapByGraffiti(
          masps.map((transaction) => transaction.asset_name),
        );
        await prisma.event.deleteMany({
          where: {
            masp_id: {
              in: masps.map((masp) => masp.id),
            },
          },
        });
      } else {
        assert(false);
      }

      const headHash =
        operation.type === BlockOperation.CONNECTED
          ? standardizeHash(operation.block.hash)
          : standardizeHash(operation.block.previousBlockHash);

      await this.maspHeadService.upsert(headHash);

      return [masps, users];
    });

    for (const maspTransaction of masps) {
      const user = users.get(maspTransaction.asset_name);
      assert(user);
      await this.eventsService.addUpdateLatestPointsJob(
        user.id,
        maspTransaction.type,
      );
    }
    return masps;
  }
}
