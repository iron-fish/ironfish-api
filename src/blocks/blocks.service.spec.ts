/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication, NotFoundException } from '@nestjs/common';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { ApiConfigService } from '../api-config/api-config.service';
import { standardizeHash } from '../common/utils/hash';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { BlocksService } from './blocks.service';
import { BlockOperation } from './enums/block-operation';
import { Block, Transaction } from '.prisma/client';

describe('BlocksService', () => {
  let app: INestApplication;
  let blocksService: BlocksService;
  let config: ApiConfigService;
  let prisma: PrismaService;
  let usersService: UsersService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    blocksService = app.get(BlocksService);
    config = app.get(ApiConfigService);
    prisma = app.get(PrismaService);
    usersService = app.get(UsersService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('upsert', () => {
    it('upserts a Block record', async () => {
      const options = {
        hash: uuid(),
        sequence: faker.datatype.number(),
        difficulty: faker.datatype.number(),
        timestamp: new Date(),
        transactionsCount: 1,
        type: BlockOperation.CONNECTED,
        graffiti: uuid(),
        previousBlockHash: uuid(),
        size: faker.datatype.number(),
      };

      const { block } = await blocksService.upsert(prisma, options);
      expect(block).toMatchObject({
        id: expect.any(Number),
        hash: options.hash,
        sequence: options.sequence,
        difficulty: BigInt(options.difficulty),
        timestamp: options.timestamp,
        transactions_count: options.transactionsCount,
        main: true,
        graffiti: options.graffiti,
        previous_block_hash: options.previousBlockHash,
        size: options.size,
      });
    });

    it('does not return a payload if a graffiti does not exist', async () => {
      const options = {
        hash: uuid(),
        sequence: faker.datatype.number(),
        difficulty: faker.datatype.number(),
        timestamp: new Date(),
        transactionsCount: 1,
        type: BlockOperation.CONNECTED,
        graffiti: uuid(),
        previousBlockHash: uuid(),
        size: faker.datatype.number(),
      };

      const { upsertBlockMinedOptions } = await blocksService.upsert(
        prisma,
        options,
      );
      expect(upsertBlockMinedOptions).toBeUndefined();
    });

    it('returns a payload for block mined event with a valid graffiti', async () => {
      const graffiti = uuid();
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti,
        country_code: faker.address.countryCode('alpha-3'),
      });
      const options = {
        hash: uuid(),
        sequence: faker.datatype.number(),
        difficulty: faker.datatype.number(),
        timestamp: new Date(),
        transactionsCount: 1,
        type: BlockOperation.CONNECTED,
        graffiti,
        previousBlockHash: uuid(),
        size: faker.datatype.number(),
      };

      const { block, upsertBlockMinedOptions } = await blocksService.upsert(
        prisma,
        options,
      );
      expect(upsertBlockMinedOptions).toEqual({
        block_id: block.id,
        user_id: user.id,
      });
    });

    it('should standardize hash and previous_block_hash', async () => {
      const hash = faker.random.alpha({ count: 10, upcase: true });
      const previousBlockHash = faker.random.alpha({
        count: 10,
        upcase: true,
      });
      expect(hash).toEqual(hash.toUpperCase());
      expect(previousBlockHash).toEqual(previousBlockHash.toUpperCase());

      await blocksService.upsert(prisma, {
        hash: hash,
        sequence: faker.datatype.number(),
        difficulty: faker.datatype.number(),
        timestamp: new Date(),
        transactionsCount: 1,
        type: BlockOperation.CONNECTED,
        graffiti: uuid(),
        previousBlockHash,
        size: faker.datatype.number(),
      });

      const block = await prisma.block.findFirst({
        where: { hash: standardizeHash(hash) },
      });
      expect(block).toMatchObject({
        hash: standardizeHash(hash),
        previous_block_hash: standardizeHash(previousBlockHash),
      });
    });

    describe('if CHECK_USER_CREATED_AT is disabled', () => {
      it('upserts records with timestamps before created_at', async () => {
        const graffiti = uuid();
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti,
          country_code: faker.address.countryCode('alpha-3'),
        });
        const options = {
          hash: uuid(),
          sequence: faker.datatype.number(),
          difficulty: faker.datatype.number(),
          timestamp: new Date('2000-01-01T00:00:00Z'),
          transactionsCount: 1,
          type: BlockOperation.CONNECTED,
          graffiti,
          previousBlockHash: uuid(),
          size: faker.datatype.number(),
        };

        jest
          .spyOn(config, 'get')
          .mockImplementationOnce(() => 0)
          .mockImplementationOnce(() => false);
        const { block, upsertBlockMinedOptions } = await blocksService.upsert(
          prisma,
          options,
        );
        expect(upsertBlockMinedOptions).toEqual({
          block_id: block.id,
          user_id: user.id,
        });
      });
    });
  });

  describe('head', () => {
    describe('with no block for the current version and main chain', () => {
      it('throws a NotFoundException', async () => {
        jest.spyOn(config, 'get').mockImplementationOnce(() => 42069);
        await expect(blocksService.head()).rejects.toThrow(NotFoundException);
      });
    });

    describe('with a valid network version', () => {
      it('returns the heaviest block', async () => {
        const block = await blocksService.head();
        expect(block).toMatchObject({
          id: expect.any(Number),
          main: true,
        });
      });
    });
  });

  describe('find', () => {
    describe('with an id', () => {
      it('returns the block', async () => {
        const { block } = await blocksService.upsert(prisma, {
          hash: uuid(),
          sequence: faker.datatype.number(),
          difficulty: faker.datatype.number(),
          timestamp: new Date(),
          transactionsCount: 1,
          type: BlockOperation.CONNECTED,
          graffiti: uuid(),
          previousBlockHash: uuid(),
          size: faker.datatype.number(),
        });
        const record = await blocksService.find(block.id);
        expect(record).toMatchObject(block);
      });
    });

    describe('with a valid hash', () => {
      it('returns the block with the correct hash', async () => {
        const testBlockHash = uuid();
        const { block } = await blocksService.upsert(prisma, {
          hash: testBlockHash,
          sequence: faker.datatype.number(),
          difficulty: faker.datatype.number(),
          timestamp: new Date(),
          transactionsCount: 1,
          type: BlockOperation.CONNECTED,
          graffiti: uuid(),
          previousBlockHash: uuid(),
          size: faker.datatype.number(),
        });
        const record = await blocksService.find({ hash: testBlockHash });
        expect(record).toMatchObject(block);
      });

      it('returns the block regardless of hash cases', async () => {
        const testBlockHash = faker.random.alpha({ count: 10, upcase: true });
        const { block } = await blocksService.upsert(prisma, {
          hash: testBlockHash,
          sequence: faker.datatype.number(),
          difficulty: faker.datatype.number(),
          timestamp: new Date(),
          transactionsCount: 1,
          type: BlockOperation.CONNECTED,
          graffiti: uuid(),
          previousBlockHash: uuid(),
          size: faker.datatype.number(),
        });
        const uppercaseHashBlock = await blocksService.find({
          hash: testBlockHash.toUpperCase(),
        });
        expect(uppercaseHashBlock).toMatchObject(block);
        const lowercaseHashBlock = await blocksService.find({
          hash: testBlockHash.toLowerCase(),
        });
        expect(lowercaseHashBlock).toMatchObject(block);
      });
    });

    describe('with a valid sequence index', () => {
      it('returns the block with the correct sequence index', async () => {
        const testBlockSequence = faker.datatype.number();
        const { block } = await blocksService.upsert(prisma, {
          hash: uuid(),
          sequence: testBlockSequence,
          difficulty: faker.datatype.number(),
          timestamp: new Date(),
          transactionsCount: 1,
          type: BlockOperation.CONNECTED,
          graffiti: uuid(),
          previousBlockHash: uuid(),
          size: faker.datatype.number(),
        });
        const record = await blocksService.find({
          sequence: testBlockSequence,
        });
        expect(block).toMatchObject(record as Block);
        expect(block.main).toBe(true);
      });
    });

    describe('with neither a valid hash nor sequence', () => {
      it('returns null', async () => {
        await blocksService.upsert(prisma, {
          hash: uuid(),
          sequence: faker.datatype.number(),
          difficulty: faker.datatype.number(),
          timestamp: new Date(),
          transactionsCount: 1,
          type: BlockOperation.CONNECTED,
          graffiti: uuid(),
          previousBlockHash: uuid(),
          size: faker.datatype.number(),
        });
        const block = await blocksService.find({
          hash: uuid(),
          sequence: faker.datatype.number(),
        });
        expect(block).toBeNull();
      });
    });
  });

  describe('list', () => {
    describe('with a valid sequence range', () => {
      it('returns blocks within the range', async () => {
        const start = 1;
        const end = 100;
        const { data: blocks } = await blocksService.list({
          sequenceGte: 2,
          sequenceLt: 4,
        });
        for (const block of blocks) {
          expect(block.sequence).toBeGreaterThanOrEqual(start);
          expect(block.sequence).toBeLessThan(end);
        }
      });
    });

    describe('with a valid partial hash search string', () => {
      it('returns block(s) with matches', async () => {
        const searchHash = 'aa';
        const { data: blocks } = await blocksService.list({
          search: searchHash,
        });
        expect(blocks.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe('with a valid sequence search string', () => {
      it('returns block(s) with matches', async () => {
        const searchSequence = '50';
        const { data: blocks } = await blocksService.list({
          search: searchSequence,
        });
        expect(blocks.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe('with a valid graffiti search string', () => {
      it('returns block(s) with matches', async () => {
        const searchGraffiti = 'testGraffiti';
        await blocksService.upsert(prisma, {
          hash: uuid(),
          sequence: faker.datatype.number(),
          difficulty: faker.datatype.number(),
          timestamp: new Date(),
          transactionsCount: 1,
          type: BlockOperation.CONNECTED,
          graffiti: searchGraffiti,
          previousBlockHash: uuid(),
          size: faker.datatype.number(),
        });

        const { data: blocks } = await blocksService.list({
          search: searchGraffiti,
        });
        expect(blocks.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('with a transaction ID', () => {
      it('returns block(s) that contain said transaction', async () => {
        const transactionId = 5;
        const blocks = await blocksService.list({
          transactionId,
          withTransactions: true,
        });

        for (const record of blocks.data) {
          const block = record as Block & { transactions: Transaction[] };
          for (const tx of block.transactions) {
            expect(tx.id).toBe(transactionId);
          }
        }
      });
    });

    describe('with main chain query parameter set to false', () => {
      it('returns block(s) that are not on the main chain', async () => {
        const blocks = await blocksService.list({
          main: false,
        });

        for (const block of blocks.data) {
          expect(block.main).toBe(false);
        }
      });
    });

    describe('with no query parameters', () => {
      it('returns block(s) in descending order', async () => {
        const { data: blocks } = await blocksService.list({});
        expect(blocks.length).toBeGreaterThanOrEqual(0);
        expect(blocks[0].id).toBeGreaterThan(blocks[1].id);
      });
    });
  });

  describe('getDateMetrics', () => {
    it('returns metrics for the day', async () => {
      const date = new Date();
      await blocksService.upsert(prisma, {
        hash: uuid(),
        sequence: faker.datatype.number(),
        difficulty: faker.datatype.number(),
        timestamp: date,
        transactionsCount: 1,
        type: BlockOperation.CONNECTED,
        graffiti: uuid(),
        previousBlockHash: uuid(),
        size: faker.datatype.number(),
      });

      const metrics = await blocksService.getDateMetrics(prisma, date);
      expect(metrics).toMatchObject({
        averageBlockTimeMs: expect.any(Number),
        averageDifficultyMillis: expect.any(Number),
        blocksCount: expect.any(Number),
        blocksWithGraffitiCount: expect.any(Number),
        chainSequence: expect.any(Number),
        cumulativeUniqueGraffiti: expect.any(Number),
        transactionsCount: expect.any(Number),
        uniqueGraffiti: expect.any(Number),
      });
    });
  });

  describe('getStatus', () => {
    it('returns statistics for blocks in the main chain', async () => {
      const status = await blocksService.getStatus();
      expect(status.chainHeight).toBeGreaterThan(0);
      expect(status.percentageMarked).toBeGreaterThan(0);
      expect(status.uniqueGraffiti).toBeGreaterThan(0);
    });
  });

  describe('disconnectAfter', () => {
    it('updates `main` to false for all blocks after a sequence', async () => {
      const sequenceGt = 10;
      await blocksService.disconnectAfter(sequenceGt);
      const blocks = await prisma.block.findMany({
        where: {
          sequence: {
            gt: sequenceGt,
          },
        },
      });

      for (const block of blocks) {
        expect(block.main).toBe(false);
      }
    });
  });

  describe('countByGraffiti', () => {
    it('returns the count of main blocks for a given graffiti', async () => {
      const graffiti = uuid();
      const count = 15;
      for (let i = 0; i < count; i++) {
        await blocksService.upsert(prisma, {
          hash: uuid(),
          sequence: faker.datatype.number(),
          difficulty: faker.datatype.number(),
          timestamp: new Date(),
          transactionsCount: 1,
          type: BlockOperation.CONNECTED,
          graffiti,
          previousBlockHash: uuid(),
          size: faker.datatype.number(),
        });

        // Seed forks to make sure they are not counted
        await blocksService.upsert(prisma, {
          hash: uuid(),
          sequence: faker.datatype.number(),
          difficulty: faker.datatype.number(),
          timestamp: new Date(),
          transactionsCount: 1,
          type: BlockOperation.DISCONNECTED,
          graffiti,
          previousBlockHash: uuid(),
          size: faker.datatype.number(),
        });
      }

      expect(await blocksService.countByGraffiti(graffiti, prisma)).toBe(count);
    });
  });
});
