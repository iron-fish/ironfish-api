/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { EventType, MultiAsset, User } from '@prisma/client';
import assert from 'assert';
import { ApiConfigService } from '../api-config/api-config.service';
import { BlockOperation } from '../blocks/enums/block-operation';
import { POINTS_PER_CATEGORY } from '../common/constants';
import { standardizeHash } from '../common/utils/hash';
import { LoggerService } from '../logger/logger.service';
import { MultiAssetHeadService } from '../multi-asset-head/multi-asset-head.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { phase3Week } from '../users/utils/week';
import { UpsertMultiAssetOperationDto } from './dto/upsert-multi-asset.dto';
import { EventsService } from './events.service';

@Injectable()
export class MultiAssetUpsertService {
  constructor(
    private readonly config: ApiConfigService,
    private readonly loggerService: LoggerService,
    private readonly multiAssetHeadService: MultiAssetHeadService,
    private readonly eventsService: EventsService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async bulkUpsert(operations: UpsertMultiAssetOperationDto[]): Promise<void> {
    for (const operation of operations) {
      // We only want to handle multi asset transactions that deal with the main chain
      // (not forks). This will only be connected and disconnected events
      const shouldUpsertMultiAsset =
        operation.type === BlockOperation.CONNECTED ||
        operation.type === BlockOperation.DISCONNECTED;

      if (shouldUpsertMultiAsset) {
        await this.upsert(operation);
      }
    }
  }

  async upsert(operation: UpsertMultiAssetOperationDto): Promise<MultiAsset[]> {
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

    const [multiAssets, users] = await this.prisma.$transaction(
      async (prisma) => {
        let users: Map<string, User>;
        let multiAssets = new Array<MultiAsset>();
        const head = await this.multiAssetHeadService.head();

        if (operation.type === BlockOperation.CONNECTED) {
          const userGraffitis = [];
          for (const transaction of operation.transactions) {
            for (const multiAsset of transaction.multiAssets) {
              userGraffitis.push(multiAsset.assetName);
            }
          }
          users = await this.usersService.findManyAndMapByGraffiti(
            userGraffitis,
          );
          if (head && head.block_hash !== previousBlockHash) {
            throw new Error(
              `Cannot connect block ${blockHash} to ${String(
                head.block_hash,
              )}, expecting ${previousBlockHash}`,
            );
          }
          // Create multiAsset transaction params
          const multiAssetParams = new Array<{
            transaction_hash: string;
            block_hash: string;
            block_sequence: number;
            network_version: number;
            type: EventType;
            asset_name: string;
            main: boolean;
          }>();
          for (const transaction of operation.transactions) {
            for (const multiAsset of transaction.multiAssets) {
              // Multi Asset -> assetName should match user graffiti
              if (!users.has(multiAsset.assetName)) {
                this.loggerService.debug(
                  `Multi Asset with name "${multiAsset.assetName}" has no corresponding user with the same graffiti`,
                );
                continue;
              }

              multiAssetParams.push({
                asset_name: multiAsset.assetName,
                type: multiAsset.type,
                transaction_hash: standardizeHash(transaction.hash),
                block_hash: blockHash,
                block_sequence: operation.block.sequence,
                main: true,
                network_version: networkVersion,
              });
            }
          }
          // Multi asset events are shared between blocks, so we need to reassign all the ones on other blocks
          if (multiAssetParams.length) {
            await prisma.multiAsset.updateMany({
              data: {
                block_hash: blockHash,
                main: true,
              },
              where: {
                OR: multiAssetParams.map((multiAsset) => ({
                  AND: {
                    transaction_hash: multiAsset.transaction_hash,
                    asset_name: multiAsset.asset_name,
                    type: multiAsset.type,
                  },
                })),
                network_version: networkVersion,
              },
            });
          }
          // Now create new not existing multi asset transactions
          await prisma.multiAsset.createMany({
            data: multiAssetParams,
            skipDuplicates: true,
          });

          multiAssets = await prisma.multiAsset.findMany({
            where: {
              block_hash: blockHash,
              network_version: networkVersion,
            },
          });
          const currentPhase3Week = phase3Week(operation.block.timestamp);
          const eventPayloads = multiAssets.map((multiAsset) => {
            const user = users.get(multiAsset.asset_name);
            assert(user);

            return {
              occurred_at: operation.block.timestamp.toISOString(),
              type: multiAsset.type,
              user_id: user.id,
              week: currentPhase3Week,
              points: POINTS_PER_CATEGORY[multiAsset.type],
              multi_asset_id: multiAsset.id,
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
          await prisma.multiAsset.updateMany({
            data: {
              main: false,
            },
            where: {
              block_hash: blockHash,
              network_version: networkVersion,
            },
          });

          multiAssets = await prisma.multiAsset.findMany({
            where: {
              block_hash: blockHash,
              network_version: networkVersion,
            },
          });
          users = await this.usersService.findManyAndMapByGraffiti(
            multiAssets.map((transaction) => transaction.asset_name),
          );
          await prisma.event.deleteMany({
            where: {
              multi_asset_id: {
                in: multiAssets.map((multi_asset) => multi_asset.id),
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

        await this.multiAssetHeadService.upsert(headHash);

        return [multiAssets, users];
      },
    );

    for (const multiAsset of multiAssets) {
      const user = users.get(multiAsset.asset_name);
      assert(user);
      await this.eventsService.addUpdateLatestPointsJob(
        user.id,
        multiAsset.type,
      );
    }
    return multiAssets;
  }
}
