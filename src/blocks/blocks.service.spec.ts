/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { bootstrapTestApp } from '../test/test-app';
import { BlocksService } from './blocks.service';

describe('EventsService', () => {
  let app: INestApplication;
  let blocksService: BlocksService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    blocksService = app.get(BlocksService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('upsert', () => {
    describe('when a hash does not exist for the network version', () => {
      it('stores a block record', async () => {
        const block = await blocksService.upsert(
          uuid(),
          faker.datatype.number(),
          faker.datatype.number(),
          true,
          new Date(),
          0,
          uuid(),
          uuid(),
        );
        expect(block).toMatchObject({
          id: expect.any(Number),
          hash: expect.any(String),
          sequence: expect.any(Number),
          difficulty: expect.any(Number),
          main: true,
          timestamp: expect.any(Date),
          transactions_count: expect.any(Number),
          graffiti: expect.any(String),
          previous_block_hash: expect.any(String),
        });
      });
    });

    describe('when a hash exists for the network version', () => {
      it('updates the block record', async () => {
        const previousBlockHash = uuid();
        const block = await blocksService.upsert(
          uuid(),
          faker.datatype.number(),
          faker.datatype.number(),
          true,
          new Date(),
          0,
          uuid(),
          previousBlockHash,
        );
        const newSequence = faker.datatype.number();
        const newDifficulty = faker.datatype.number();
        const newGraffiti = uuid();

        const newBlock = await blocksService.upsert(
          block.hash,
          newSequence,
          newDifficulty,
          true,
          new Date(),
          0,
          newGraffiti,
          previousBlockHash,
        );
        expect(newBlock).toMatchObject({
          id: block.id,
          hash: block.hash,
          sequence: newSequence,
          difficulty: newDifficulty,
          main: true,
          timestamp: expect.any(Date),
          transactions_count: block.transactions_count,
          graffiti: newGraffiti,
          previous_block_hash: previousBlockHash,
        });
      });
    });
  });
});
