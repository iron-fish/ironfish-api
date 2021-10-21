/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  INestApplication,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import faker from 'faker';
import { ulid } from 'ulid';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { FaucetTransactionsService } from './faucet-transactions.service';

describe('FaucetTransactionService', () => {
  let app: INestApplication;
  let faucetTransactionsService: FaucetTransactionsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    faucetTransactionsService = app.get(FaucetTransactionsService);
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('findOrThrow', () => {
    describe('with a valid id', () => {
      it('returns the record', async () => {
        const email = faker.internet.email();
        const publicKey = ulid();
        const faucetTransaction = await faucetTransactionsService.create({
          email,
          publicKey,
        });
        const record = await faucetTransactionsService.findOrThrow(
          faucetTransaction.id,
        );
        expect(record).not.toBeNull();
        expect(record).toMatchObject(faucetTransaction);
      });
    });

    describe('with a missing id', () => {
      it('returns null', async () => {
        await expect(
          faucetTransactionsService.findOrThrow(100000),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('create', () => {
    it('creates a FaucetTransaction record', async () => {
      const email = faker.internet.email();
      const publicKey = ulid();
      const faucetTransaction = await faucetTransactionsService.create({
        email,
        publicKey,
      });

      expect(faucetTransaction).toMatchObject({
        id: expect.any(Number),
        email,
        public_key: publicKey,
      });
    });
  });

  describe('next', () => {
    describe('when a FaucetTransaction is already running', () => {
      it('returns null', async () => {
        const runningFaucetTransaction = {
          id: 0,
          created_at: new Date(),
          updated_at: new Date(),
          public_key: 'mock-key',
          email: null,
          completed_at: null,
          started_at: new Date(),
        };
        jest
          .spyOn(prisma.faucetTransaction, 'findFirst')
          .mockResolvedValueOnce(runningFaucetTransaction);

        expect(await faucetTransactionsService.next()).toMatchObject(
          runningFaucetTransaction,
        );
      });
    });

    describe('when no FaucetTransactions are running', () => {
      it('returns the next available FaucetTransaction', async () => {
        const pendingFaucetTransaction = {
          id: 0,
          created_at: new Date(),
          updated_at: new Date(),
          public_key: 'mock-key',
          email: null,
          completed_at: null,
          started_at: null,
        };
        jest
          .spyOn(prisma.faucetTransaction, 'findFirst')
          // No currently running FaucetTransaction
          .mockResolvedValueOnce(null)
          // Waiting to run FaucetTransaction
          .mockResolvedValueOnce(pendingFaucetTransaction);

        expect(await faucetTransactionsService.next()).toMatchObject(
          pendingFaucetTransaction,
        );
      });
    });
  });

  describe('start', () => {
    describe('if the FaucetTransaction has completed', () => {
      it('throws an UnprocessableEntityException', async () => {
        const faucetTransaction = {
          id: 0,
          created_at: new Date(),
          updated_at: new Date(),
          public_key: 'mock-key',
          email: null,
          completed_at: new Date(),
          started_at: new Date(),
        };
        await expect(
          faucetTransactionsService.start(faucetTransaction),
        ).rejects.toThrow(UnprocessableEntityException);
      });
    });

    describe('with a valid FaucetTransaction', () => {
      it('updates the `started_at` column for the record', async () => {
        const email = faker.internet.email();
        const publicKey = ulid();
        const faucetTransaction = await faucetTransactionsService.create({
          email,
          publicKey,
        });

        const updatedRecord = await faucetTransactionsService.start(
          faucetTransaction,
        );
        expect(updatedRecord).toMatchObject({
          id: faucetTransaction.id,
          public_key: faucetTransaction.public_key,
          started_at: expect.any(Date),
        });
      });
    });
  });

  describe('complete', () => {
    describe('if the FaucetTransaction has completed', () => {
      it('throws an UnprocessableEntityException', async () => {
        const faucetTransaction = {
          id: 0,
          created_at: new Date(),
          updated_at: new Date(),
          public_key: 'mock-key',
          email: null,
          completed_at: new Date(),
          started_at: new Date(),
        };
        await expect(
          faucetTransactionsService.complete(faucetTransaction),
        ).rejects.toThrow(UnprocessableEntityException);
      });
    });

    describe('with a valid FaucetTransaction', () => {
      it('updates the `completed_at` column for the record', async () => {
        const email = faker.internet.email();
        const publicKey = ulid();
        const faucetTransaction = await faucetTransactionsService.create({
          email,
          publicKey,
        });
        const startedFaucetTransaction = await faucetTransactionsService.start(
          faucetTransaction,
        );

        const updatedRecord = await faucetTransactionsService.complete(
          startedFaucetTransaction,
        );
        expect(updatedRecord).toMatchObject({
          id: faucetTransaction.id,
          public_key: faucetTransaction.public_key,
          completed_at: expect.any(Date),
        });
      });
    });
  });

  describe('getGlobalStatus', () => {
    it('returns the number of completed, pending, and running Faucet Transactions', async () => {
      const status = await faucetTransactionsService.getGlobalStatus();
      expect(status).toEqual({
        completed: await prisma.faucetTransaction.count({
          where: {
            completed_at: { not: null },
          },
        }),
        running: await prisma.faucetTransaction.count({
          where: {
            started_at: { not: null },
            completed_at: null,
          },
        }),
        pending: await prisma.faucetTransaction.count({
          where: {
            started_at: null,
            completed_at: null,
          },
        }),
      });
    });
  });
});
