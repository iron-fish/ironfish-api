/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication, NotFoundException } from '@nestjs/common';
import { AssetsService } from '../assets/assets.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { TransactionsService } from '../transactions/transactions.service';

describe('AssetsService', () => {
  let app: INestApplication;
  let assetsService: AssetsService;
  let prisma: PrismaService;
  let transactionsService: TransactionsService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    assetsService = app.get(AssetsService);
    prisma = app.get(PrismaService);
    transactionsService = app.get(TransactionsService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('findOrThrow', () => {
    describe('with a missing identifier', () => {
      it('throws a NotFoundException', async () => {
        await expect(
          assetsService.findByIdentifierOrThrow('alskdfj'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('for a valid identifier', () => {
      it('returns the record', async () => {
        const transaction = (
          await transactionsService.createMany([
            {
              fee: 0,
              hash: 'foo',
              notes: [],
              size: 0,
              spends: [],
            },
          ])
        )[0];

        const asset = await assetsService.upsert(
          {
            identifier: 'foo',
            metadata: 'test',
            name: 'bar',
            owner: 'baz',
          },
          transaction,
          prisma,
        );

        expect(
          await assetsService.findByIdentifierOrThrow(asset.identifier),
        ).toEqual(asset);
      });
    });
  });

  describe('upsert', () => {
    describe('with the first transaction', () => {
      it('upserts a new record', async () => {
        const transaction = (
          await transactionsService.createMany([
            {
              fee: 0,
              hash: 'foo',
              notes: [],
              size: 0,
              spends: [],
            },
          ])
        )[0];

        const identifier = 'fooasdf';
        const metadata = 'test';
        const name = 'bar';
        const owner = 'baz';
        const asset = await assetsService.upsert(
          {
            identifier,
            metadata,
            name,
            owner,
          },
          transaction,
          prisma,
        );

        expect(asset).toMatchObject({
          identifier,
          metadata,
          name,
          owner,
          created_transaction_id: transaction.id,
        });
      });
    });

    describe('with a subsequent transaction', () => {
      it('does not update the record', async () => {
        const transaction = (
          await transactionsService.createMany([
            {
              fee: 0,
              hash: 'foo',
              notes: [],
              size: 0,
              spends: [],
            },
          ])
        )[0];

        const identifier = 'fooasdf';
        const metadata = 'test';
        const name = 'bar';
        const owner = 'baz';
        await assetsService.upsert(
          {
            identifier,
            metadata,
            name,
            owner,
          },
          transaction,
          prisma,
        );

        const secondTransaction = (
          await transactionsService.createMany([
            {
              fee: 0,
              hash: 'foo',
              notes: [],
              size: 0,
              spends: [],
            },
          ])
        )[0];

        const asset = await assetsService.upsert(
          {
            identifier,
            metadata,
            name,
            owner,
          },
          secondTransaction,
          prisma,
        );
        expect(asset).toMatchObject({
          identifier,
          metadata,
          name,
          owner,
          created_transaction_id: transaction.id,
        });
      });
    });
  });

  describe('updateSupply', () => {
    it('adjusts the supply with the provided delta', async () => {
      const transaction = (
        await transactionsService.createMany([
          {
            fee: 0,
            hash: 'foo',
            notes: [],
            size: 0,
            spends: [],
          },
        ])
      )[0];

      const identifier = 'id';
      const supply = BigInt(10);
      let asset = await prisma.asset.create({
        data: {
          created_transaction_id: transaction.id,
          identifier,
          metadata: 'foo',
          name: 'bar',
          owner: 'baz',
          supply,
        },
      });

      const delta = -BigInt(3);
      asset = await assetsService.updateSupply(asset, delta, prisma);
      expect(asset.supply).toEqual(supply + delta);
    });
  });
});
