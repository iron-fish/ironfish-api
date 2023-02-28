/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventType, User } from '@prisma/client';
import assert from 'assert';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { BlockOperation } from '../blocks/enums/block-operation';
import { MultiAssetHeadService } from '../multi-asset-head/multi-asset-head.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import {
  MultiAssetsDto,
  UpsertMultiAssetDto,
} from './dto/upsert-multi-asset.dto';
import { MultiAssetUpsertService } from './multi-asset.upsert.service';

describe('MultiAssetUpsertService', () => {
  let app: INestApplication;
  let multiAssetHeadService: MultiAssetHeadService;
  let multiAssetUpsertService: MultiAssetUpsertService;
  let prismaService: PrismaService;
  let usersService: UsersService;
  let config: ConfigService;

  let user1: User;
  let user2: User;
  let transaction1: MultiAssetsDto;
  let transaction2: MultiAssetsDto;
  let transaction3: MultiAssetsDto;
  let payload: UpsertMultiAssetDto;

  beforeAll(async () => {
    const user1Graffiti = 'user1multiasset';
    const user2Graffiti = 'user2multiasset';
    transaction1 = {
      hash: 'transactionHash1',
      multiAssets: [
        {
          type: EventType.MULTI_ASSET_MINT,
          assetName: user1Graffiti,
        },
      ],
    };
    transaction2 = {
      hash: 'transactionHash2',
      multiAssets: [
        {
          type: EventType.MULTI_ASSET_BURN,
          assetName: user2Graffiti,
        },
      ],
    };
    transaction3 = {
      hash: 'transactionHash3',
      multiAssets: [
        {
          type: EventType.MULTI_ASSET_MINT,
          assetName: user2Graffiti,
        },
      ],
    };
    payload = {
      operations: [
        {
          transactions: [transaction1, transaction2],
          type: BlockOperation.CONNECTED,
          block: {
            hash: 'multiassetupsertblockhash1',
            previousBlockHash: 'previousblockhash1',
            timestamp: new Date('2023-01-01'),
            sequence: 3,
          },
        },
        {
          transactions: [transaction3],
          type: BlockOperation.CONNECTED,
          block: {
            hash: 'multiassetupsertblockhash2',
            previousBlockHash: 'previousblockhash2',
            timestamp: new Date('2023-01-01'),
            sequence: 4,
          },
        },
      ],
    };
    app = await bootstrapTestApp();
    multiAssetUpsertService = app.get(MultiAssetUpsertService);
    multiAssetHeadService = app.get(MultiAssetHeadService);
    prismaService = app.get(PrismaService);
    usersService = app.get(UsersService);
    config = app.get(ConfigService);
    await app.init();

    user1 = await usersService.create({
      email: faker.internet.email(),
      graffiti: user1Graffiti,
      countryCode: faker.address.countryCode(),
    });

    user2 = await usersService.create({
      email: faker.internet.email(),
      graffiti: user2Graffiti,
      countryCode: faker.address.countryCode(),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upsert', () => {
    it('upserts new multiasset transactions and events', async () => {
      // setup
      await prismaService.multiAssetHead.deleteMany();

      const individualPayload = payload.operations[0];

      // test
      await multiAssetUpsertService.upsert(individualPayload);

      const user1Events = await prismaService.event.findMany({
        where: {
          user_id: user1.id,
          type: transaction1.multiAssets[0].type,
        },
      });

      const user2Events = await prismaService.event.findMany({
        where: {
          user_id: user2.id,
          type: transaction2.multiAssets[0].type,
        },
      });

      expect(user1Events).toHaveLength(1);
      expect(user2Events).toHaveLength(1);

      const user1MultiAsset = await prismaService.multiAsset.findMany({
        where: {
          asset_name: user1.graffiti,
        },
      });

      const user2MultiAsset = await prismaService.multiAsset.findMany({
        where: {
          asset_name: user2.graffiti,
        },
      });

      expect(user1MultiAsset).toHaveLength(1);
      expect(user1MultiAsset[0].asset_name).toEqual(user1.graffiti);
      expect(user1MultiAsset[0].type).toEqual(EventType.MULTI_ASSET_MINT);
      expect(user2MultiAsset).toHaveLength(1);
      expect(user2MultiAsset[0].asset_name).toEqual(user2.graffiti);
      expect(user2MultiAsset[0].type).toEqual(EventType.MULTI_ASSET_BURN);

      expect(user1Events[0].multi_asset_id).toEqual(user1MultiAsset[0].id);
      expect(user1Events[0].type).toEqual(EventType.MULTI_ASSET_MINT);
      expect(user2Events[0].multi_asset_id).toEqual(user2MultiAsset[0].id);
      expect(user2Events[0].type).toEqual(EventType.MULTI_ASSET_BURN);
    });

    it('updates multiasset block hash on reorg', async () => {
      // setup
      await prismaService.multiAssetHead.deleteMany();
      const individualPayload = payload.operations[0];

      // test
      await multiAssetUpsertService.upsert(individualPayload);
      await multiAssetUpsertService.upsert({
        ...individualPayload,
        transactions: [],
        type: BlockOperation.DISCONNECTED,
      });
      const updatedHash = 'newhash';
      await multiAssetUpsertService.upsert({
        ...individualPayload,
        block: {
          ...individualPayload.block,
          hash: updatedHash,
        },
      });
      const user1MultiAsset = await prismaService.multiAsset.findMany({
        where: {
          asset_name: user1.graffiti,
        },
      });

      expect(user1MultiAsset).toHaveLength(1);
      expect(user1MultiAsset[0].asset_name).toEqual(user1.graffiti);
      expect(user1MultiAsset[0].type).toEqual(EventType.MULTI_ASSET_MINT);
      expect(user1MultiAsset[0].block_hash).toBe(updatedHash);
    });

    describe('on blocks after the phase 3 end', () => {
      it('returns no events', async () => {
        await prismaService.multiAssetHead.deleteMany();

        const timestamp = new Date(Date.UTC(2023, 1, 26, 1, 0, 0));
        const payload = {
          transactions: [transaction3],
          type: BlockOperation.CONNECTED,
          block: {
            hash: 'multiassetupsertblockhash2',
            previousBlockHash: 'previousblockhash2',
            timestamp,
            sequence: 4,
          },
        };

        jest.spyOn(config, 'get').mockImplementationOnce(() => true);
        expect(await multiAssetUpsertService.upsert(payload)).toEqual([]);
      });
    });

    describe('on DISCONNECTED operations', () => {
      it('removes events', async () => {
        // connected operation
        await prismaService.multiAssetHead.deleteMany();
        await multiAssetUpsertService.upsert(payload.operations[0]);

        //disconnected operation
        const disconnectingOperation = {
          ...payload.operations[0],
          transactions: [],
          type: BlockOperation.DISCONNECTED,
        };

        await multiAssetUpsertService.upsert(disconnectingOperation);

        const user1Events = await prismaService.event.findMany({
          where: {
            user_id: user1.id,
            type: payload.operations[0].transactions[0].multiAssets[0].type,
          },
        });

        const user1MultiAsset = await prismaService.multiAsset.findMany({
          where: {
            asset_name: user1.graffiti,
          },
        });

        expect(user1Events).toHaveLength(0);
        expect(user1MultiAsset[0].main).toBe(false);
      });
    });

    it('updates the multi asset transactions head', async () => {
      const head = await multiAssetHeadService.head();
      assert(head);
      const operation = {
        transactions: [transaction1, transaction2],
        type: BlockOperation.CONNECTED,
        block: {
          hash: 'multiassetupsertblockhash1',
          previousBlockHash: head.block_hash,
          timestamp: new Date(Date.UTC(2023, 1, 25, 1, 0, 0)),
          sequence: 3,
        },
      };

      await multiAssetUpsertService.upsert(operation);

      await expect(multiAssetHeadService.head()).resolves.toMatchObject({
        block_hash: payload.operations[0].block.hash,
      });
    });
  });
});

describe('Weekly transaction limit', () => {
  let app: INestApplication;
  let multiAssetHeadService: MultiAssetHeadService;
  let multiAssetService: MultiAssetUpsertService;
  let prismaService: PrismaService;
  let usersService: UsersService;
  beforeAll(async () => {
    app = await bootstrapTestApp();
    multiAssetService = app.get(MultiAssetUpsertService);
    multiAssetHeadService = app.get(MultiAssetHeadService);
    prismaService = app.get(PrismaService);
    usersService = app.get(UsersService);
    await app.init();
  });

  it('creates two transactions but only one event (transactions sent same week)', async () => {
    // setup
    const greedyUser = await usersService.create({
      email: faker.internet.email(),
      graffiti: uuid(),
      countryCode: faker.address.countryCode(),
    });
    const head = await multiAssetHeadService.head();
    const initialOperation = {
      transactions: [
        {
          hash: 'limitUserHash',
          multiAssets: [
            {
              type: EventType.MULTI_ASSET_MINT,
              assetName: greedyUser.graffiti,
            },
          ],
        },
      ],
      type: BlockOperation.CONNECTED,
      block: {
        hash: 'sameweekblock',
        previousBlockHash: head?.block_hash || 'foo',
        timestamp: new Date('2023/02/01'),
        sequence: 1,
      },
    };
    const secondOperation = {
      transactions: [
        {
          hash: 'limitUserHash2',
          multiAssets: [
            {
              type: EventType.MULTI_ASSET_MINT,
              assetName: greedyUser.graffiti,
            },
          ],
        },
      ],
      type: BlockOperation.CONNECTED,
      block: {
        hash: 'sameweekblock2',
        previousBlockHash: 'sameweekblock',
        timestamp: new Date('2023/02/01'),
        sequence: 2,
      },
    };
    // test
    await multiAssetService.upsert(initialOperation);
    await multiAssetService.upsert(secondOperation);
    const greedUserMultiAssets = await prismaService.multiAsset.findMany({
      where: {
        asset_name: greedyUser.graffiti,
      },
    });
    const greedyUserEvents = await prismaService.event.findMany({
      where: {
        user_id: greedyUser.id,
      },
    });
    expect(greedUserMultiAssets).toHaveLength(2);
    expect(greedyUserEvents).toHaveLength(1);
  });

  it('creates new multi asset event if previousblock was disconnected', async () => {
    // setup
    const legitUser = await usersService.create({
      email: faker.internet.email(),
      graffiti: uuid(),
      countryCode: faker.address.countryCode(),
    });
    const head = await multiAssetHeadService.head();
    const initialOperation = {
      transactions: [
        {
          hash: 'originaldisconnectedhash',
          multiAssets: [
            {
              type: EventType.MULTI_ASSET_MINT,
              assetName: legitUser.graffiti,
            },
          ],
        },
      ],
      type: BlockOperation.CONNECTED,
      block: {
        hash: 'goingtodisconnectblock',
        previousBlockHash: head?.block_hash || 'foo',
        timestamp: new Date('2023/02/01'),
        sequence: 1,
      },
    };
    const disconnectOperation = {
      ...initialOperation,
      transactions: [],
      type: BlockOperation.DISCONNECTED,
    };
    const secondOperation = {
      transactions: [
        {
          hash: 'validnewtransaction',
          multiAssets: [
            {
              type: EventType.MULTI_ASSET_MINT,
              assetName: legitUser.graffiti,
            },
          ],
        },
      ],
      type: BlockOperation.CONNECTED,
      block: {
        hash: 'pointtest2',
        previousBlockHash: head?.block_hash || 'foo',
        timestamp: new Date('2023/02/01'),
        sequence: 2,
      },
    };
    // test
    await multiAssetService.upsert(initialOperation);
    await multiAssetService.upsert(disconnectOperation);
    await multiAssetService.upsert(secondOperation);
    const legitUserTransactions = await prismaService.multiAsset.findMany({
      where: {
        asset_name: legitUser.graffiti,
      },
    });
    const legitUserEvents = await prismaService.event.findMany({
      where: {
        user_id: legitUser.id,
      },
    });
    expect(legitUserTransactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          transaction_hash: 'originaldisconnectedhash',
          main: false,
        }),
        expect.objectContaining({
          transaction_hash: 'validnewtransaction',
          main: true,
        }),
      ]),
    );
    expect(legitUserEvents).toHaveLength(1);
    expect(legitUserEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: EventType.MULTI_ASSET_MINT,
          week: 2769,
        }),
      ]),
    );
  });

  it('rejects disconnect where transactions are provided', async () => {
    // setup
    const user = await usersService.create({
      email: faker.internet.email(),
      graffiti: uuid(),
      countryCode: faker.address.countryCode(),
    });
    const head = await multiAssetHeadService.head();
    const invalidDisconnect = {
      transactions: [
        {
          hash: 'originaldisconnectedhash',
          multiAssets: [
            {
              type: EventType.MULTI_ASSET_MINT,
              assetName: user.graffiti,
            },
          ],
        },
      ],
      type: BlockOperation.DISCONNECTED,
      block: {
        hash: 'goingtodisconnectblock',
        previousBlockHash: head?.block_hash || 'foo',
        timestamp: new Date('2023/02/01'),
        sequence: 1,
      },
    };
    await expect(multiAssetService.upsert(invalidDisconnect)).rejects.toThrow(
      'Transactions should not be sent with disconnected blocks',
    );
  });
});
