/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { EventType, User } from '@prisma/client';
import assert from 'assert';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { BlocksService } from '../blocks/blocks.service';
import { BlockOperation } from '../blocks/enums/block-operation';
import { ORE_TO_IRON } from '../common/constants';
import { DepositHeadsService } from '../deposit-heads/deposit-heads.service';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { DepositsUpsertService } from './deposits.upsert.service';
import {
  DepositTransactionDto,
  UpsertDepositsNoteDto,
  UpsertDepositsOperationDto,
} from './dto/upsert-deposit.dto';

describe('DepositsUpsertService', () => {
  let app: INestApplication;
  let blocksService: BlocksService;
  let depositHeadsService: DepositHeadsService;
  let depositsUpsertService: DepositsUpsertService;
  let graphileWorkerService: GraphileWorkerService;
  let prisma: PrismaService;
  let usersService: UsersService;

  let user1: User;
  let user2: User;
  let transaction1: DepositTransactionDto;
  let transaction2: DepositTransactionDto;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    blocksService = app.get(BlocksService);
    depositHeadsService = app.get(DepositHeadsService);
    depositsUpsertService = app.get(DepositsUpsertService);
    graphileWorkerService = app.get(GraphileWorkerService);
    prisma = app.get(PrismaService);
    usersService = app.get(UsersService);
    await app.init();

    user1 = await usersService.create({
      email: faker.internet.email(),
      graffiti: 'user1',
      country_code: faker.address.countryCode(),
    });

    user2 = await usersService.create({
      email: faker.internet.email(),
      graffiti: 'user2',
      country_code: faker.address.countryCode(),
    });

    transaction1 = transaction(
      [...notes([1, 2], user1.graffiti), ...notes([0.1, 3], user2.graffiti)],
      'transaction1Hash',
    );

    transaction2 = transaction(
      [...notes([0.05], user1.graffiti), ...notes([1], user2.graffiti)],
      'transaction2Hash',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('bulkUpsert', () => {
    it('queues upsert deposit jobs for the payloads', async () => {
      const addJob = jest
        .spyOn(graphileWorkerService, 'addJob')
        .mockImplementation(jest.fn());

      const payload = {
        operations: [
          depositOperation(
            [transaction1],
            BlockOperation.CONNECTED,
            'block1Hash',
          ),
          depositOperation(
            [transaction2],
            BlockOperation.CONNECTED,
            'block2Hash',
          ),
        ],
      };

      await depositsUpsertService.bulkUpsert(payload.operations);

      expect(addJob).toHaveBeenCalledTimes(payload.operations.length);
      assert.ok(addJob.mock.calls);
      for (let i = 0; i < payload.operations.length; i++) {
        expect(addJob.mock.calls[i][0]).toBe(
          GraphileWorkerPattern.UPSERT_DEPOSIT,
        );
        expect(addJob.mock.calls[i][1]).toEqual(payload.operations[i]);
      }
    });
  });

  describe('upsert', () => {
    it('upserts new deposits and events', async () => {
      const payload = depositOperation(
        [transaction1, transaction2],
        BlockOperation.CONNECTED,
        'block1Hash',
      );

      await depositsUpsertService.upsert(payload);

      const user1Events = await prisma.event.findMany({
        where: {
          user_id: user1.id,
          type: EventType.SEND_TRANSACTION,
        },
      });

      const user2Events = await prisma.event.findMany({
        where: {
          user_id: user2.id,
          type: EventType.SEND_TRANSACTION,
        },
      });

      expect(user1Events).toHaveLength(1);
      expect(user2Events).toHaveLength(2);

      const user1Deposits = await prisma.deposit.findMany({
        where: {
          graffiti: user1.graffiti,
        },
      });

      const user2Deposits = await prisma.deposit.findMany({
        where: {
          graffiti: user2.graffiti,
        },
      });

      expect(user1Deposits).toHaveLength(2);
      expect(user2Deposits).toHaveLength(2);

      expect(user1Events[0].deposit_id).toEqual(user1Deposits[0].id);
      expect(user2Events[0].deposit_id).toEqual(user2Deposits[0].id);
      expect(user2Events[1].deposit_id).toEqual(user2Deposits[1].id);
    });

    describe('on DISCONNECTED operations', () => {
      it('removes events', async () => {
        const payload1 = depositOperation(
          [transaction1, transaction2],
          BlockOperation.CONNECTED,
          'block1Hash',
        );

        await depositsUpsertService.upsert(payload1);

        const payload2 = depositOperation(
          [transaction2],
          BlockOperation.DISCONNECTED,
          'block1Hash',
        );

        await depositsUpsertService.upsert(payload2);

        const user2Events = await prisma.event.findMany({
          where: {
            user_id: user2.id,
            type: EventType.SEND_TRANSACTION,
          },
        });

        const user1Deposits = await prisma.deposit.findMany({
          where: {
            graffiti: user1.graffiti,
          },
        });

        const user2Deposits = await prisma.deposit.findMany({
          where: {
            graffiti: user2.graffiti,
          },
        });

        expect(user2Events[0].points).toBe(1);
        expect(user2Events[1].points).toBe(0);
        expect(user2Events[1].deposit_id).toEqual(user2Deposits[1].id);
        expect(user2Deposits[1].amount).toEqual(1 * ORE_TO_IRON);

        expect(user1Deposits).toHaveLength(2);
        expect(user2Deposits).toHaveLength(2);

        expect(user1Deposits[1].main).toBe(false);
        expect(user2Deposits[1].main).toBe(false);
      });
    });

    it('updates the deposit head', async () => {
      const updateHead = jest
        .spyOn(depositHeadsService, 'upsert')
        .mockImplementation(jest.fn());

      const operation = depositOperation(
        [transaction1],
        BlockOperation.CONNECTED,
        'block1Hash',
      );
      await depositsUpsertService.upsert(operation);

      assert.ok(updateHead.mock.calls);
      expect(updateHead.mock.calls[0][0]).toBe(operation.block.hash);
    });

    describe('on FORK operations', () => {
      it('does not delete events on FORK operations', async () => {
        const transaction3 = transaction(
          [...notes([0.1], user2.graffiti)],
          'transaction3Hash',
        );

        const payload = depositOperation(
          [transaction3],
          BlockOperation.CONNECTED,
          'block3Hash',
        );

        await depositsUpsertService.upsert(payload);

        const user2EventsBefore = await prisma.event.findMany({
          where: {
            user_id: user2.id,
            type: EventType.SEND_TRANSACTION,
          },
        });

        const forkPayload = depositOperation(
          [transaction3],
          BlockOperation.FORK,
          'block3Hash',
        );

        await depositsUpsertService.upsert(forkPayload);

        const user2EventsAfter = await prisma.event.findMany({
          where: {
            user_id: user2.id,
            type: EventType.SEND_TRANSACTION,
          },
        });

        expect(user2EventsBefore).toEqual(user2EventsAfter);
      });
    });
  });

  describe('mismatchedDeposits', () => {
    it('finds deposits where deposits.main does not match block.main', async () => {
      const operation = depositOperation(
        [transaction1],
        BlockOperation.DISCONNECTED,
        'block1Hash',
      );

      const deposits = await depositsUpsertService.upsert(operation);

      const { block } = await blockWithMismatch(operation);

      const mismatched = await depositsUpsertService.mismatchedDeposits(0);

      for (const deposit of deposits) {
        expect(deposit.block_hash).toBe(block.hash);
        expect(deposit.main).not.toBe(block.main);
        expect(mismatched).toContainEqual({
          ...deposit,
          block_main: block.main,
          block_timestamp: block.timestamp,
        });
      }
    });

    it('ignores mismatches on blocks within beforeSequence blocks of the head', async () => {
      const blockHead = await blocksService.head();
      const mismatched = await depositsUpsertService.mismatchedDeposits(
        blockHead.sequence + 1,
      );

      // only deposits with no matching block are found
      for (const deposit of mismatched) {
        expect(deposit.block_timestamp).toBeNull();
      }
    });
  });

  describe('refreshDeposits', () => {
    it('enqueues refreshDeposit jobs', async () => {
      const operation = depositOperation(
        [transaction1],
        BlockOperation.CONNECTED,
        uuid(),
      );

      await depositsUpsertService.upsert(operation);

      const addJob = jest
        .spyOn(graphileWorkerService, 'addJob')
        .mockImplementation(jest.fn());

      await depositsUpsertService.refreshDeposits();

      expect(addJob).toHaveBeenCalledWith(
        'REFRESH_DEPOSIT',
        expect.objectContaining({
          id: expect.any(Number),
          created_at: expect.any(Date),
          updated_at: expect.any(Date),
          transaction_hash: expect.any(String),
          block_hash: expect.any(String),
          graffiti: expect.any(String),
          block_sequence: expect.any(Number),
          network_version: expect.any(Number),
          main: expect.any(Boolean),
          amount: expect.any(Number),
          block_main: null,
          block_timestamp: null,
        }),
        expect.objectContaining({
          queueName: expect.stringMatching('refresh_deposit_[0-9]+'),
        }),
      );
    });
  });

  describe('refreshDeposit', () => {
    it('updates deposit.main to match block.main', async () => {
      const operation = depositOperation(
        [transaction1],
        BlockOperation.DISCONNECTED,
        'block1Hash',
      );

      const deposits = await depositsUpsertService.upsert(operation);

      const { block } = await blockWithMismatch(operation);

      expect(deposits[0].main).not.toBe(block.main);

      await depositsUpsertService.refreshDeposit({
        ...deposits[0],
        block_main: block.main,
        block_timestamp: block.timestamp,
      });

      const updatedDeposit = await prisma.deposit.findUnique({
        where: { id: deposits[0].id },
      });

      expect(updatedDeposit?.main).toBe(block.main);
    });
  });

  const notes = (amounts: number[], graffiti: string) => {
    return amounts.map((amount) => {
      return { memo: graffiti, amount: amount * ORE_TO_IRON };
    });
  };

  describe('upsert deposit with greater than min increment', () => {
    it('updates deposit.main to match block.main', async () => {
      const tx = transaction(
        [...notes([1, 1.0], user1.graffiti)],
        'transaction1Hash',
      );
      const operation = depositOperation(
        [tx],
        BlockOperation.DISCONNECTED,
        'block1Hash',
      );

      const deposits = await depositsUpsertService.upsert(operation);

      const depositEvent = await prisma.event.findUnique({
        where: { deposit_id: deposits[0].id },
      });

      expect(depositEvent?.points).toBe(10);
    });
  });

  const transaction = (notes: UpsertDepositsNoteDto[], hash?: string) => {
    return {
      hash: hash || uuid(),
      notes,
    };
  };

  const depositOperation = (
    transactions: DepositTransactionDto[],
    type: BlockOperation,
    hash?: string,
    previousBlockHash?: string,
    sequence?: number,
  ): UpsertDepositsOperationDto => {
    return {
      type,
      block: {
        hash: hash || uuid(),
        timestamp: new Date(),
        sequence: sequence || 0,
        previousBlockHash: previousBlockHash || uuid(),
      },
      transactions,
    };
  };

  const blockWithMismatch = (operation: UpsertDepositsOperationDto) => {
    const blockOptions = {
      hash: operation.block.hash,
      sequence: operation.block.sequence,
      difficulty: faker.datatype.number(),
      timestamp: operation.block.timestamp,
      transactionsCount: transaction1.notes.length,
      type:
        operation.type === BlockOperation.CONNECTED
          ? BlockOperation.DISCONNECTED
          : BlockOperation.CONNECTED,
      graffiti: user1.graffiti,
      previousBlockHash: operation.block.previousBlockHash,
      size: faker.datatype.number(),
    };

    return blocksService.upsert(prisma, blockOptions);
  };
});
