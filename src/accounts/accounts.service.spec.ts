/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  INestApplication,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { AccountsService } from './accounts.service';

describe('AccountsService', () => {
  let app: INestApplication;
  let accountsService: AccountsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    accountsService = app.get(AccountsService);
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('findOrThrow', () => {
    describe('with a valid id', () => {
      it('returns the record', async () => {
        const account = await prisma.account.create({
          data: {
            public_address: uuid(),
          },
        });
        const record = await accountsService.findOrThrow(account.id);
        expect(record).not.toBeNull();
        expect(record).toMatchObject(account);
      });
    });

    describe('with a missing id', () => {
      it('returns null', async () => {
        await expect(accountsService.findOrThrow(1337)).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('list', () => {
    it('returns a chunk of accounts', async () => {
      const limit = 2;
      const records = await accountsService.list({
        limit,
      });
      expect(records).toHaveLength(limit);
      for (const record of records) {
        expect(record).toMatchObject({
          id: expect.any(Number),
          public_address: expect.any(String),
        });
      }
    });

    describe('if an order by points is provided', () => {
      it('sorts the accounts by points', async () => {
        const records = await accountsService.list({
          orderBy: 'total_points',
        });

        for (let i = 1; i < records.length; i++) {
          const previousRecord = records[i - 1];
          const record = records[i];
          expect(previousRecord.total_points).toBeGreaterThanOrEqual(
            record.total_points,
          );
        }
      });
    });
  });

  describe('create', () => {
    describe('with a duplicate public address', () => {
      it('throws an exception', async () => {
        const publicAddress = uuid();
        await prisma.account.create({
          data: {
            public_address: publicAddress,
          },
        });

        await expect(accountsService.create(publicAddress)).rejects.toThrow(
          UnprocessableEntityException,
        );
      });
    });

    describe('with a new public address', () => {
      it('creates a new record', async () => {
        const publicAddress = uuid();
        const account = await accountsService.create(publicAddress);

        expect(account).toMatchObject({
          id: expect.any(Number),
          public_address: publicAddress,
        });
      });
    });
  });
});
