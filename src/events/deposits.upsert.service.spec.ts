/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { EventType, User } from '@prisma/client';
import assert from 'assert';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
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
        const payload = depositOperation(
          [transaction2],
          BlockOperation.DISCONNECTED,
          'block1Hash',
        );

        await depositsUpsertService.upsert(payload);

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
});
