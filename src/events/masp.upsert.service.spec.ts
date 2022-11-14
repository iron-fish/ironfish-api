/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { EventType, User } from '@prisma/client';
import assert from 'assert';
import faker from 'faker';
import { BlockOperation } from '../blocks/enums/block-operation';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
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
  let graphileWorkerService: GraphileWorkerService;
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
      notes: [
        {
          memo: 'foo',
          type: EventType.MASP_MINT,
          assetName: user1Graffiti,
        },
      ],
    };
    transaction2 = {
      hash: 'transactionHash2',
      notes: [
        {
          memo: 'foo',
          type: EventType.MASP_BURN,
          assetName: user2Graffiti,
        },
      ],
    };
    transaction3 = {
      hash: 'transactionHash3',
      notes: [
        {
          memo: 'foo',
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
    maspTransactionsUpsertService = app.get(MaspTransactionsUpsertService);
    maspTransactionHeadService = app.get(MaspTransactionHeadService);
    prismaService = app.get(PrismaService);
    graphileWorkerService = app.get(GraphileWorkerService);
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

  describe('bulkUpsert', () => {
    it('queues upsert masp transaction jobs for the payloads', async () => {
      const addJob = jest
        .spyOn(graphileWorkerService, 'addJob')
        .mockImplementation(jest.fn());

      await maspTransactionsUpsertService.bulkUpsert(payload.operations);

      expect(addJob).toHaveBeenCalledTimes(payload.operations.length);
      assert.ok(addJob.mock.calls);
      for (let i = 0; i < payload.operations.length; i++) {
        expect(addJob.mock.calls[i][0]).toBe(
          GraphileWorkerPattern.UPSERT_MASP_TRANSACTION,
        );
        expect(addJob.mock.calls[i][1]).toEqual(payload.operations[i]);
      }
    });
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
          type: transaction1.notes[0].type,
        },
      });

      const user2Events = await prismaService.event.findMany({
        where: {
          user_id: user2.id,
          type: transaction2.notes[0].type,
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

    describe('on DISCONNECTED operations', () => {
      it('removes events', async () => {
        // connected operation
        await maspTransactionsUpsertService.upsert(payload.operations[0]);

        //disconnected operation
        const diconnectingOperation = {
          ...payload.operations[0],
          type: BlockOperation.DISCONNECTED,
        };

        await maspTransactionsUpsertService.upsert(diconnectingOperation);

        const user1Events = await prismaService.event.findMany({
          where: {
            user_id: user1.id,
            type: diconnectingOperation.transactions[0].notes[0].type,
          },
        });

        const user1MaspTransactions =
          await prismaService.maspTransaction.findMany({
            where: {
              asset_name: user1.graffiti,
            },
          });

        expect(user1Events[0]).toBeFalsy();

        expect(user1MaspTransactions[0].main).toBe(false);
      });
    });

    it('updates the deposit head', async () => {
      const operation = payload.operations[0];
      const updateHead = jest
        .spyOn(maspTransactionHeadService, 'upsert')
        .mockImplementation(jest.fn());
      await maspTransactionsUpsertService.upsert(operation);

      assert.ok(updateHead.mock.calls);
      expect(updateHead.mock.calls[0][0]).toBe(operation.block.hash);
    });
  });
});
