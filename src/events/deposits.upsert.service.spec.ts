/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { User } from '@prisma/client';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { BlocksService } from '../blocks/blocks.service';
import { BlockOperation } from '../blocks/enums/block-operation';
import { MAX_POINT_BLOCK_SEQUENCE, ORE_TO_IRON } from '../common/constants';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { DepositsService } from './deposits.service';
import { DepositsUpsertService } from './deposits.upsert.service';
import {
  DepositTransactionDto,
  UpsertDepositsNoteDto,
  UpsertDepositsOperationDto,
} from './dto/upsert-deposit.dto';

describe('DepositsUpsertService', () => {
  let app: INestApplication;
  let blocksService: BlocksService;
  let depositsUpsertService: DepositsUpsertService;
  let graphileWorkerService: GraphileWorkerService;
  let depositsService: DepositsService;
  let prisma: PrismaService;
  let usersService: UsersService;

  let user1: User;
  let user2: User;
  let transaction1: DepositTransactionDto;
  let transaction2: DepositTransactionDto;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    blocksService = app.get(BlocksService);
    depositsUpsertService = app.get(DepositsUpsertService);
    depositsService = app.get(DepositsService);
    graphileWorkerService = app.get(GraphileWorkerService);
    prisma = app.get(PrismaService);
    usersService = app.get(UsersService);
    await app.init();

    user1 = await usersService.create({
      email: faker.internet.email(),
      graffiti: 'user1',
      countryCode: faker.address.countryCode(),
    });

    user2 = await usersService.create({
      email: faker.internet.email(),
      graffiti: 'user2',
      countryCode: faker.address.countryCode(),
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
      const upsert = jest
        .spyOn(depositsUpsertService, 'upsert')
        .mockImplementation(jest.fn());

      const head = await depositsService.head();

      const operations = [
        depositOperation(
          [transaction1],
          BlockOperation.CONNECTED,
          'block1Hash',
          head?.block_hash,
        ),
        depositOperation(
          [transaction2],
          BlockOperation.CONNECTED,
          'block2Hash',
          'block1Hash',
        ),
        depositOperation(
          [transaction1],
          BlockOperation.FORK,
          'block11Hash',
          head?.block_hash,
        ),
      ];

      await depositsUpsertService.bulkUpsert(operations);

      expect(upsert).toHaveBeenCalledTimes(2);
      expect(upsert.mock.calls[0]).toEqual([operations[0]]);
      expect(upsert.mock.calls[1]).toEqual([operations[1]]);

      upsert.mockRestore();
    });
  });

  describe('upsert', () => {
    it('upserts deposits and events', async () => {
      const user1 = await usersService.create({
        email: faker.internet.email(),
        countryCode: faker.address.countryCode(),
        graffiti: uuid(),
      });

      const user2 = await usersService.create({
        email: faker.internet.email(),
        countryCode: faker.address.countryCode(),
        graffiti: uuid(),
      });

      const payload = depositOperation(
        [
          transaction([
            ...notes([1, 2], user1.graffiti),
            ...notes([0.1, 3], user2.graffiti),
          ]),
          transaction([
            ...notes([0.05], user1.graffiti),
            ...notes([1.0], user2.graffiti),
          ]),
        ],
        BlockOperation.CONNECTED,
      );

      await depositsUpsertService.upsert(payload);

      const user1Events = await prisma.event.findMany({
        where: { user_id: user1.id },
      });
      const user2Events = await prisma.event.findMany({
        where: { user_id: user2.id },
      });
      const user1Deposits = await prisma.deposit.findMany({
        where: { graffiti: user1.graffiti },
      });
      const user2Deposits = await prisma.deposit.findMany({
        where: { graffiti: user2.graffiti },
      });

      expect(user1Events).toHaveLength(1);
      expect(user2Events).toHaveLength(2);
      expect(user1Deposits).toHaveLength(2);
      expect(user2Deposits).toHaveLength(2);

      expect(user1Events[0].deposit_id).toEqual(user1Deposits[0].id);
      expect(user2Events[0].deposit_id).toEqual(user2Deposits[0].id);
      expect(user2Events[1].deposit_id).toEqual(user2Deposits[1].id);
    });

    it('should not reassign any deposits', async () => {
      const user = await usersService.create({
        email: faker.internet.email(),
        countryCode: faker.address.countryCode(),
        graffiti: uuid(),
      });

      const head = await depositsService.head();

      const operation1 = depositOperation(
        [transaction(notes([0.1], user.graffiti))],
        BlockOperation.CONNECTED,
        undefined,
        head?.block_hash,
      );

      const operation2 = depositOperation(
        [],
        BlockOperation.CONNECTED,
        undefined,
        operation1.block.hash,
      );

      const operation3 = depositOperation(
        [],
        BlockOperation.DISCONNECTED,
        operation2.block.hash,
        operation1.block.hash,
      );

      await depositsUpsertService.upsert(operation1);

      let deposits = await prisma.deposit.findMany({
        where: { graffiti: user.graffiti },
      });

      expect(deposits).toHaveLength(1);
      expect(deposits[0]).toMatchObject({ main: true });

      await depositsUpsertService.upsert(operation2);
      await depositsUpsertService.upsert(operation3);

      deposits = await prisma.deposit.findMany({
        where: { graffiti: user.graffiti },
      });

      expect(deposits).toHaveLength(1);
      expect(deposits[0]).toMatchObject({ main: true });
    });

    it('correctly counts points', async () => {
      async function getPoints(
        user: User,
        amount: number,
      ): Promise<number | undefined> {
        const head = await depositsService.head();

        const [deposit] = await depositsUpsertService.upsert(
          depositOperation(
            [transaction(notes([amount], user.graffiti), uuid())],
            BlockOperation.CONNECTED,
            undefined,
            head?.block_hash,
            MAX_POINT_BLOCK_SEQUENCE,
          ),
        );

        const event = await prisma.event.findUnique({
          where: { deposit_id: deposit.id },
        });

        return event?.points;
      }

      const user = await usersService.create({
        email: faker.internet.email(),
        countryCode: faker.address.countryCode(),
        graffiti: uuid(),
      });

      expect(await getPoints(user, 0.1)).toBe(1);
      expect(await getPoints(user, 0.32)).toBe(3);
      expect(await getPoints(user, 0.6)).toBe(6);
      expect(await getPoints(user, 0.59)).toBe(5);
      expect(await getPoints(user, 0.05)).toBeUndefined();
    });

    it('on disconnect removes events', async () => {
      const user1 = await usersService.create({
        email: faker.internet.email(),
        countryCode: faker.address.countryCode(),
        graffiti: uuid(),
      });

      const user2 = await usersService.create({
        email: faker.internet.email(),
        countryCode: faker.address.countryCode(),
        graffiti: uuid(),
      });

      const transaction1 = transaction([
        ...notes([1, 2], user1.graffiti),
        ...notes([0.1, 3], user2.graffiti),
      ]);

      const transaction2 = transaction([
        ...notes([0.05], user1.graffiti),
        ...notes([1.0], user2.graffiti),
      ]);

      const head = await depositsService.head();

      const operation1 = depositOperation(
        [transaction1, transaction2],
        BlockOperation.CONNECTED,
        undefined,
        head?.block_hash,
      );

      const operation2 = depositOperation(
        [transaction1, transaction2],
        BlockOperation.DISCONNECTED,
        operation1.block.hash,
        head?.block_hash,
      );

      await depositsUpsertService.upsert(operation1);

      let user1Events = await prisma.event.findMany({
        where: {
          user_id: user1.id,
        },
      });

      let user2Events = await prisma.event.findMany({
        where: {
          user_id: user2.id,
        },
      });

      let user1Deposits = await prisma.deposit.findMany({
        where: {
          graffiti: user1.graffiti,
        },
      });

      let user2Deposits = await prisma.deposit.findMany({
        where: {
          graffiti: user2.graffiti,
        },
      });

      expect(user1Events).toHaveLength(1);
      expect(user2Events).toHaveLength(2);
      expect(user1Deposits).toHaveLength(2);
      expect(user2Deposits).toHaveLength(2);
      expect(user1Deposits[0].main).toBe(true);
      expect(user2Deposits[0].main).toBe(true);
      expect(user2Deposits[1].main).toBe(true);

      await depositsUpsertService.upsert(operation2);

      user1Events = await prisma.event.findMany({
        where: {
          user_id: user1.id,
        },
      });

      user2Events = await prisma.event.findMany({
        where: {
          user_id: user2.id,
        },
      });

      user1Deposits = await prisma.deposit.findMany({
        where: {
          graffiti: user1.graffiti,
        },
      });

      user2Deposits = await prisma.deposit.findMany({
        where: {
          graffiti: user2.graffiti,
        },
      });

      expect(user1Events).toHaveLength(0);
      expect(user2Events).toHaveLength(0);
      expect(user1Deposits).toHaveLength(2);
      expect(user2Deposits).toHaveLength(2);
      expect(user1Deposits[0].main).toBe(false);
      expect(user2Deposits[0].main).toBe(false);
      expect(user2Deposits[1].main).toBe(false);
    });

    it('updates the deposit head', async () => {
      const head = await depositsService.head();

      const operation = depositOperation(
        [transaction1],
        BlockOperation.CONNECTED,
        uuid(),
        head?.block_hash,
      );

      await depositsUpsertService.upsert(operation);

      await expect(depositsService.head()).resolves.toMatchObject({
        block_hash: operation.block.hash,
      });
    });

    it('does does not process fork events', async () => {
      const payload = depositOperation([], BlockOperation.FORK);

      await expect(depositsUpsertService.upsert(payload)).rejects.toThrow(
        'FORK not supported',
      );
    });
  });

  describe('mismatchedDeposits', () => {
    it('finds deposits where deposits.main does not match block.main', async () => {
      const head = await depositsService.head();

      const operation1 = depositOperation(
        [transaction1],
        BlockOperation.CONNECTED,
        undefined,
        head?.block_hash,
      );

      const operation2 = depositOperation(
        [transaction1],
        BlockOperation.DISCONNECTED,
        operation1.block.hash,
        operation1.block.previousBlockHash,
      );

      await depositsUpsertService.upsert(operation1);
      const deposits = await depositsUpsertService.upsert(operation2);
      const { block } = await blockWithMismatch(operation2);

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
      const head = await depositsService.head();

      const operation = depositOperation(
        [transaction1],
        BlockOperation.CONNECTED,
        undefined,
        head?.block_hash,
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
      const head = await depositsService.head();

      const transaction1 = transaction(notes([1], user1.graffiti));

      const operation1 = depositOperation(
        [transaction1],
        BlockOperation.CONNECTED,
        undefined,
        head?.block_hash,
      );

      const operation2 = depositOperation(
        [transaction1],
        BlockOperation.DISCONNECTED,
        operation1.block.hash,
        operation1.block.previousBlockHash,
      );

      await depositsUpsertService.upsert(operation1);
      const deposits = await depositsUpsertService.upsert(operation2);

      const { block } = await blockWithMismatch(operation2);

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
      work: faker.datatype.number(),
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
