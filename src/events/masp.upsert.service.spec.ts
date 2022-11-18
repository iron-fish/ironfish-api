/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { EventType, User } from '@prisma/client';
import assert from 'assert';
import faker from 'faker';
import { BlockOperation } from '../blocks/enums/block-operation';
import { MaspTransactionHeadService } from '../masp-transaction-head/masp-transaction-head.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import {
  MaspTransactionDto,
  UpsertMaspTransactionsDto,
} from './dto/upsert-masp.dto';
import { MaspTransactionsUpsertService } from './masp.upsert.service';
describe('MaspTransactionUpsertService', () => {
  let app: INestApplication;
  let maspTransactionHeadService: MaspTransactionHeadService;
  let maspTransactionsUpsertService: MaspTransactionsUpsertService;
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
      type: EventType.MASP_MINT,
      assetName: user1Graffiti,
    };
    transaction2 = {
      hash: 'transactionHash2',
      type: EventType.MASP_BURN,
      assetName: user2Graffiti,
    };
    transaction3 = {
      hash: 'transactionHash3',
      type: EventType.MASP_MINT,
      assetName: user2Graffiti,
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
    maspTransactionsUpsertService = app.get(MaspTransactionsUpsertService);
    maspTransactionHeadService = app.get(MaspTransactionHeadService);
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
          type: transaction1.type,
        },
      });

      const user2Events = await prismaService.event.findMany({
        where: {
          user_id: user2.id,
          type: transaction2.type,
        },
      });

      expect(user1Events).toHaveLength(1);
      expect(user2Events).toHaveLength(1);

      const user1MaspTransactions =
        await prismaService.maspTransaction.findMany({
          where: {
            asset_name: user1.graffiti,
          },
        });

      const user2MaspTransactions =
        await prismaService.maspTransaction.findMany({
          where: {
            asset_name: user2.graffiti,
          },
        });

      expect(user1MaspTransactions).toHaveLength(1);
      expect(user1MaspTransactions[0].asset_name).toEqual(user1.graffiti);
      expect(user1MaspTransactions[0].type).toEqual(EventType.MASP_MINT);
      expect(user2MaspTransactions).toHaveLength(1);
      expect(user2MaspTransactions[0].asset_name).toEqual(user2.graffiti);
      expect(user2MaspTransactions[0].type).toEqual(EventType.MASP_BURN);

      expect(user1Events[0].masp_transaction_id).toEqual(
        user1MaspTransactions[0].id,
      );
      expect(user1Events[0].type).toEqual(EventType.MASP_MINT);
      expect(user2Events[0].masp_transaction_id).toEqual(
        user2MaspTransactions[0].id,
      );
      expect(user2Events[0].type).toEqual(EventType.MASP_BURN);
    });

    it('updates MASP block hash on reorg', async () => {
      // setup
      await prismaService.maspTransactionHead.delete({ where: { id: 1 } });
      const individualPayload = payload.operations[0];

      // test
      await maspTransactionsUpsertService.upsert(individualPayload);
      await maspTransactionsUpsertService.upsert({
        ...individualPayload,
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
      const user1MaspTransactions =
        await prismaService.maspTransaction.findMany({
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
        await prismaService.maspTransactionHead.delete({ where: { id: 1 } });
        // await prismaService.event.deleteMany();
        await maspTransactionsUpsertService.upsert(payload.operations[0]);

        //disconnected operation
        const disconnectingOperation = {
          ...payload.operations[0],
          type: BlockOperation.DISCONNECTED,
        };

        await maspTransactionsUpsertService.upsert(disconnectingOperation);

        const user1Events = await prismaService.event.findMany({
          where: {
            user_id: user1.id,
            type: disconnectingOperation.transactions[0].type,
          },
        });

        const user1MaspTransactions =
          await prismaService.maspTransaction.findMany({
            where: {
              asset_name: user1.graffiti,
            },
          });

        expect(user1Events).toHaveLength(0);
        expect(user1MaspTransactions[0].main).toBe(false);
      });
    });

    it('updates the masp transactions head', async () => {
      const head = await maspTransactionHeadService.head();
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

      await expect(maspTransactionHeadService.head()).resolves.toMatchObject({
        block_hash: payload.operations[0].block.hash,
      });
    });
  });
});
