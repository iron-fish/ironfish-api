/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { EventType, User } from '@prisma/client';
import assert from 'assert';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { BlockOperation } from '../blocks/enums/block-operation';
import { MaspHeadService } from '../masp-transaction-head/masp-transaction-head.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import {
  MaspTransactionDto,
  UpsertMaspTransactionsDto,
} from './dto/upsert-masp.dto';
import { MaspUpsertService } from './masp.upsert.service';
describe('MaspTransactionUpsertService', () => {
  let app: INestApplication;
  let maspHeadService: MaspHeadService;
  let maspTransactionsUpsertService: MaspUpsertService;
  let prismaService: PrismaService;
  let usersService: UsersService;

  let user1: User;
  let user2: User;
  let transaction1: MaspTransactionDto;
  let transaction2: MaspTransactionDto;
  let transaction3: MaspTransactionDto;
  let payload: UpsertMaspTransactionsDto;

  beforeAll(async () => {
    const user1Graffiti = 'user1masp';
    const user2Graffiti = 'user2masp';
    transaction1 = {
      hash: 'transactionHash1',
      masps: [
        {
          type: EventType.MASP_MINT,
          assetName: user1Graffiti,
        },
      ],
    };
    transaction2 = {
      hash: 'transactionHash2',
      masps: [
        {
          type: EventType.MASP_BURN,
          assetName: user2Graffiti,
        },
      ],
    };
    transaction3 = {
      hash: 'transactionHash3',
      masps: [
        {
          type: EventType.MASP_MINT,
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
            hash: 'maspupsertblockhash1',
            previousBlockHash: 'previousblockhash1',
            timestamp: new Date(),
            sequence: 3,
          },
        },
        {
          transactions: [transaction3],
          type: BlockOperation.CONNECTED,
          block: {
            hash: 'maspupsertblockhash2',
            previousBlockHash: 'previousblockhash2',
            timestamp: new Date(),
            sequence: 4,
          },
        },
      ],
    };
    app = await bootstrapTestApp();
    maspTransactionsUpsertService = app.get(MaspUpsertService);
    maspHeadService = app.get(MaspHeadService);
    prismaService = app.get(PrismaService);
    usersService = app.get(UsersService);
    await app.init();

    user1 = await usersService.create({
      email: faker.internet.email(),
      graffiti: user1Graffiti,
      country_code: faker.address.countryCode(),
    });

    user2 = await usersService.create({
      email: faker.internet.email(),
      graffiti: user2Graffiti,
      country_code: faker.address.countryCode(),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upsert', () => {
    it('upserts new masp transactions and events', async () => {
      // setup

      const individualPayload = payload.operations[0];

      // test
      await maspTransactionsUpsertService.upsert(individualPayload);

      const user1Events = await prismaService.event.findMany({
        where: {
          user_id: user1.id,
          type: transaction1.masps[0].type,
        },
      });

      const user2Events = await prismaService.event.findMany({
        where: {
          user_id: user2.id,
          type: transaction2.masps[0].type,
        },
      });

      expect(user1Events).toHaveLength(1);
      expect(user2Events).toHaveLength(1);

      const user1Masps = await prismaService.masp.findMany({
        where: {
          asset_name: user1.graffiti,
        },
      });

      const user2Masps = await prismaService.masp.findMany({
        where: {
          asset_name: user2.graffiti,
        },
      });

      expect(user1Masps).toHaveLength(1);
      expect(user1Masps[0].asset_name).toEqual(user1.graffiti);
      expect(user1Masps[0].type).toEqual(EventType.MASP_MINT);
      expect(user2Masps).toHaveLength(1);
      expect(user2Masps[0].asset_name).toEqual(user2.graffiti);
      expect(user2Masps[0].type).toEqual(EventType.MASP_BURN);

      expect(user1Events[0].masp_id).toEqual(user1Masps[0].id);
      expect(user1Events[0].type).toEqual(EventType.MASP_MINT);
      expect(user2Events[0].masp_id).toEqual(user2Masps[0].id);
      expect(user2Events[0].type).toEqual(EventType.MASP_BURN);
    });

    it('updates MASP block hash on reorg', async () => {
      // setup
      await prismaService.maspHead.delete({ where: { id: 1 } });
      const individualPayload = payload.operations[0];

      // test
      await maspTransactionsUpsertService.upsert(individualPayload);
      await maspTransactionsUpsertService.upsert({
        ...individualPayload,
        transactions: [],
        type: BlockOperation.DISCONNECTED,
      });
      const updatedHash = 'newhash';
      await maspTransactionsUpsertService.upsert({
        ...individualPayload,
        block: {
          ...individualPayload.block,
          hash: updatedHash,
        },
      });
      const user1MaspTransactions = await prismaService.masp.findMany({
        where: {
          asset_name: user1.graffiti,
        },
      });

      expect(user1MaspTransactions).toHaveLength(1);
      expect(user1MaspTransactions[0].asset_name).toEqual(user1.graffiti);
      expect(user1MaspTransactions[0].type).toEqual(EventType.MASP_MINT);
      expect(user1MaspTransactions[0].block_hash).toBe(updatedHash);
    });
    describe('on DISCONNECTED operations', () => {
      it('removes events', async () => {
        // connected operation
        await prismaService.maspHead.delete({ where: { id: 1 } });
        await maspTransactionsUpsertService.upsert(payload.operations[0]);

        //disconnected operation
        const disconnectingOperation = {
          ...payload.operations[0],
          transactions: [],
          type: BlockOperation.DISCONNECTED,
        };

        await maspTransactionsUpsertService.upsert(disconnectingOperation);

        const user1Events = await prismaService.event.findMany({
          where: {
            user_id: user1.id,
            type: payload.operations[0].transactions[0].masps[0].type,
          },
        });

        const user1MaspTransactions = await prismaService.masp.findMany({
          where: {
            asset_name: user1.graffiti,
          },
        });

        expect(user1Events).toHaveLength(0);
        expect(user1MaspTransactions[0].main).toBe(false);
      });
    });

    it('updates the masp transactions head', async () => {
      const head = await maspHeadService.head();
      assert(head);
      const operation = {
        transactions: [transaction1, transaction2],
        type: BlockOperation.CONNECTED,
        block: {
          hash: 'maspupsertblockhash1',
          previousBlockHash: head.block_hash,
          timestamp: new Date(),
          sequence: 3,
        },
      };

      await maspTransactionsUpsertService.upsert(operation);

      await expect(maspHeadService.head()).resolves.toMatchObject({
        block_hash: payload.operations[0].block.hash,
      });
    });
  });
});

describe('Weekly transaction limit', () => {
  let app: INestApplication;
  let maspHeadService: MaspHeadService;
  let maspUpsertService: MaspUpsertService;
  let prismaService: PrismaService;
  let usersService: UsersService;
  beforeAll(async () => {
    app = await bootstrapTestApp();
    maspUpsertService = app.get(MaspUpsertService);
    maspHeadService = app.get(MaspHeadService);
    prismaService = app.get(PrismaService);
    usersService = app.get(UsersService);
    await app.init();
  });

  it('creates two transactions but only one event (transactions sent same week)', async () => {
    // setup
    const greedyUser = await usersService.create({
      email: faker.internet.email(),
      graffiti: uuid(),
      country_code: faker.address.countryCode(),
    });
    const head = await maspHeadService.head();
    const initialOperation = {
      transactions: [
        {
          hash: 'limitUserHash',
          masps: [
            {
              type: EventType.MASP_MINT,
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
          masps: [
            {
              type: EventType.MASP_MINT,
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
    await maspUpsertService.upsert(initialOperation);
    await maspUpsertService.upsert(secondOperation);
    const greedUserMasps = await prismaService.masp.findMany({
      where: {
        asset_name: greedyUser.graffiti,
      },
    });
    const greedyUserEvents = await prismaService.event.findMany({
      where: {
        user_id: greedyUser.id,
      },
    });
    expect(greedUserMasps).toHaveLength(2);
    expect(greedyUserEvents).toHaveLength(1);
  });

  it('creates new MASP transaction AND MASP event if previousblock was disconnected', async () => {
    // setup
    const legitUser = await usersService.create({
      email: faker.internet.email(),
      graffiti: uuid(),
      country_code: faker.address.countryCode(),
    });
    const head = await maspHeadService.head();
    const initialOperation = {
      transactions: [
        {
          hash: 'originaldisconnectedhash',
          masps: [
            {
              type: EventType.MASP_MINT,
              assetName: legitUser.graffiti,
            },
          ],
        },
      ],
      type: BlockOperation.CONNECTED,
      block: {
        hash: 'goingtodisconnectblock',
        previousBlockHash: head?.block_hash || 'foo',
        timestamp: new Date('2023/03/01'),
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
          masps: [
            {
              type: EventType.MASP_MINT,
              assetName: legitUser.graffiti,
            },
          ],
        },
      ],
      type: BlockOperation.CONNECTED,
      block: {
        hash: 'pointtest2',
        previousBlockHash: head?.block_hash || 'foo',
        timestamp: new Date('2023/03/01'),
        sequence: 2,
      },
    };
    // test
    await maspUpsertService.upsert(initialOperation);
    await maspUpsertService.upsert(disconnectOperation);
    await maspUpsertService.upsert(secondOperation);
    const legitUserTransactions = await prismaService.masp.findMany({
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
        expect.objectContaining({ type: EventType.MASP_MINT, week: 2773 }),
      ]),
    );
  });
});
