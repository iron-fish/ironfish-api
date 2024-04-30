/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
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

  beforeEach(async () => {
    await prisma.asset.deleteMany({});
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
            creator: 'baz',
            owner: 'baz',
          },
          transaction,
          prisma,
        );

        expect(
          await assetsService.findByIdentifierOrThrow(asset.identifier),
        ).toEqual({ ...asset, verified_metadata: null });
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
        const creator = 'baz';
        const owner = 'baz';
        const asset = await assetsService.upsert(
          {
            identifier,
            metadata,
            name,
            creator,
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
        const creator = 'baz';
        const owner = 'baz';
        await assetsService.upsert(
          {
            identifier,
            metadata,
            name,
            creator,
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
            creator,
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
          creator: 'baz',
          owner: 'baz',
          supply,
        },
      });

      const delta = -BigInt(3);
      asset = await assetsService.updateSupply(asset, delta, prisma);
      expect(asset.supply).toEqual(supply + delta);
    });
  });

  describe('list', () => {
    it('returns a paginated list of assets', async () => {
      const transaction = (
        await transactionsService.createMany([
          {
            fee: 0,
            hash: uuid(),
            notes: [],
            size: 0,
            spends: [],
          },
        ])
      )[0];

      const _firstAsset = await assetsService.upsert(
        {
          identifier: uuid(),
          metadata: uuid(),
          name: uuid(),
          creator: uuid(),
          owner: uuid(),
        },
        transaction,
        prisma,
      );
      const secondAsset = await assetsService.upsert(
        {
          identifier: uuid(),
          metadata: uuid(),
          name: uuid(),
          creator: uuid(),
          owner: uuid(),
        },
        transaction,
        prisma,
      );
      const thirdAsset = await assetsService.upsert(
        {
          identifier: uuid(),
          metadata: uuid(),
          name: uuid(),
          creator: uuid(),
          owner: uuid(),
        },
        transaction,
        prisma,
      );

      expect(await assetsService.list({ limit: 2 })).toEqual({
        data: [
          { ...thirdAsset, verified_metadata: null },
          { ...secondAsset, verified_metadata: null },
        ],
        hasNext: true,
        hasPrevious: false,
      });
    });
  });

  describe('listMetadata', () => {
    it('returns an empty list if there are no records', async () => {
      expect(await assetsService.listMetadata()).toEqual([]);
    });

    it('returns verified asset metadata', async () => {
      const transaction = (
        await transactionsService.createMany([
          {
            fee: 0,
            hash: uuid(),
            notes: [],
            size: 0,
            spends: [],
          },
        ])
      )[0];

      const firstAsset = await assetsService.upsert(
        {
          identifier: uuid(),
          metadata: uuid(),
          name: uuid(),
          owner: uuid(),
          creator: uuid(),
        },
        transaction,
        prisma,
      );
      const secondAsset = await assetsService.upsert(
        {
          identifier: uuid(),
          metadata: uuid(),
          name: uuid(),
          owner: uuid(),
          creator: uuid(),
        },
        transaction,
        prisma,
      );

      await assetsService.updateVerified({
        identifier: firstAsset.identifier,
        symbol: 'FOO',
      });

      await assetsService.updateVerified({
        identifier: secondAsset.identifier,
        symbol: 'BAR',
        decimals: 2,
        logoURI: 'https://example.com/foo.jpg',
        website: 'https://example.com/',
      });

      expect(await assetsService.listMetadata()).toEqual([
        {
          identifier: firstAsset.identifier,
          symbol: 'FOO',
          decimals: null,
          logo_uri: null,
          website: null,
          created_at: expect.any(Date),
          updated_at: expect.any(Date),
        },
        {
          identifier: secondAsset.identifier,
          symbol: 'BAR',
          decimals: 2,
          logo_uri: 'https://example.com/foo.jpg',
          website: 'https://example.com/',
          created_at: expect.any(Date),
          updated_at: expect.any(Date),
        },
      ]);
    });
  });

  describe('lastUpdate', () => {
    it('returns `null` if there are no records', async () => {
      expect(await assetsService.lastUpdate()).toBeNull();
    });

    it('returns the maximum of `updated_at`', async () => {
      const transaction = (
        await transactionsService.createMany([
          {
            fee: 0,
            hash: uuid(),
            notes: [],
            size: 0,
            spends: [],
          },
        ])
      )[0];

      const firstAsset = await assetsService.upsert(
        {
          identifier: uuid(),
          metadata: uuid(),
          name: uuid(),
          creator: uuid(),
          owner: uuid(),
        },
        transaction,
        prisma,
      );
      const secondAsset = await assetsService.upsert(
        {
          identifier: uuid(),
          metadata: uuid(),
          name: uuid(),
          creator: uuid(),
          owner: uuid(),
        },
        transaction,
        prisma,
      );

      expect(secondAsset.updated_at.valueOf()).toBeGreaterThan(
        firstAsset.updated_at.valueOf(),
      );
      expect(await assetsService.lastUpdate()).toStrictEqual(
        secondAsset.updated_at,
      );

      const updatedAsset = await prisma.asset.update({
        where: {
          id: firstAsset.id,
        },
        data: {
          name: uuid(),
        },
      });

      expect(updatedAsset.updated_at.valueOf()).toBeGreaterThan(
        firstAsset.updated_at.valueOf(),
      );
      expect(updatedAsset.updated_at.valueOf()).toBeGreaterThan(
        secondAsset.updated_at.valueOf(),
      );
      expect(await assetsService.lastUpdate()).toStrictEqual(
        updatedAsset.updated_at,
      );
    });
  });
});
