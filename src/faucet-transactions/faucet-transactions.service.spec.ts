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
        jest
          .spyOn(prisma.faucetTransaction, 'findFirst')
          .mockResolvedValueOnce({
            id: 0,
            created_at: new Date(),
            updated_at: new Date(),
            public_key: 'mock-key',
            email: null,
            completed_at: null,
            started_at: new Date(),
          });

        expect(await faucetTransactionsService.next()).toBeNull();
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
    describe('if the FaucetTransaction has been started', () => {
      it('throws an UnprocessableEntityException', async () => {
        const faucetTransaction = {
          id: 0,
          created_at: new Date(),
          updated_at: new Date(),
          public_key: 'mock-key',
          email: null,
          completed_at: null,
          started_at: new Date(),
        };
        await expect(
          faucetTransactionsService.start(faucetTransaction),
        ).rejects.toThrow(UnprocessableEntityException);
      });
    });

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
});
