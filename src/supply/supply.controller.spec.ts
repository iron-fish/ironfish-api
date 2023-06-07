/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import faker from 'faker';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { BlocksService } from '../blocks/blocks.service';
import { BlockOperation } from '../blocks/enums/block-operation';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';

describe('SupplyController', () => {
  let app: INestApplication;
  let blocksService: BlocksService;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    blocksService = app.get(BlocksService);
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /supply/circulating', () => {
    it('returns the circulating supply', async () => {
      const options = {
        hash: uuid(),
        sequence: faker.datatype.number(),
        difficulty: BigInt(faker.datatype.number()),
        work: BigInt(faker.datatype.number()),
        timestamp: new Date(),
        transactionsCount: 1,
        type: BlockOperation.CONNECTED,
        graffiti: uuid(),
        previousBlockHash: uuid(),
        size: faker.datatype.number(),
      };
      await blocksService.upsert(prisma, options);

      const { text } = await request(app.getHttpServer())
        .get('/supply/circulating')
        .expect(HttpStatus.OK);

      const head = await blocksService.head();
      const { circulating } = blocksService.totalAndCirculatingSupplies(
        head.sequence,
      );

      expect(text).toBe(circulating.toString());
    });
  });

  describe('GET /supply/total', () => {
    it('returns the total supply', async () => {
      const options = {
        hash: uuid(),
        sequence: faker.datatype.number(),
        difficulty: BigInt(faker.datatype.number()),
        work: BigInt(faker.datatype.number()),
        timestamp: new Date(),
        transactionsCount: 1,
        type: BlockOperation.CONNECTED,
        graffiti: uuid(),
        previousBlockHash: uuid(),
        size: faker.datatype.number(),
      };
      await blocksService.upsert(prisma, options);

      const { text } = await request(app.getHttpServer())
        .get('/supply/total')
        .expect(HttpStatus.OK);

      const head = await blocksService.head();
      const { total } = blocksService.totalAndCirculatingSupplies(
        head.sequence,
      );

      expect(text).toBe(total.toString());
    });
  });
});
