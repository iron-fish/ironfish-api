/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { EventType } from '@prisma/client';
import faker from 'faker';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { ApiConfigService } from '../api-config/api-config.service';
import { BlockOperation } from '../blocks/enums/block-operation';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { MaspTransactionHeadService } from '../masp-transaction-head/masp-transaction-head.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import {
  MaspTransactionDto,
  UpsertMaspTransactionsDto,
} from './dto/upsert-masp.dto';
import { MaspTransactionsUpsertService } from './masp.upsert.service';

describe('MaspController', () => {
  let app: INestApplication;
  let config: ApiConfigService;
  let maspTransactionsUpsertService: MaspTransactionsUpsertService;
  let graphileWorkerService: GraphileWorkerService;
  let maspTransactionHeadService: MaspTransactionHeadService;
  let usersService: UsersService;
  let API_KEY: string;
  let user1Graffiti: string;
  let user2Graffiti: string;
  let transaction1: MaspTransactionDto;
  let transaction2: MaspTransactionDto;
  let payload: UpsertMaspTransactionsDto;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    config = app.get(ApiConfigService);
    maspTransactionsUpsertService = app.get(MaspTransactionsUpsertService);
    maspTransactionHeadService = app.get(MaspTransactionHeadService);
    graphileWorkerService = app.get(GraphileWorkerService);
    usersService = app.get(UsersService);
    API_KEY = config.get<string>('IRONFISH_API_KEY');
    await app.init();

    user1Graffiti = 'user1maspcontroller';
    user2Graffiti = 'user2maspcontroller';
    transaction1 = {
      hash: 'transactionHash1',
      type: EventType.MASP_MINT,
      assetName: user1Graffiti,
    };
    transaction2 = {
      hash: 'transactionHash2',
      type: EventType.MASP_BURN,
      assetName: user2Graffiti,
    };
    payload = {
      operations: [
        {
          transactions: [transaction1],
          type: BlockOperation.CONNECTED,
          block: {
            hash: 'controllerblockhash1',
            previousBlockHash: 'previousblockhash1',
            timestamp: new Date(),
            sequence: 3,
          },
        },
        {
          transactions: [transaction2],
          type: BlockOperation.CONNECTED,
          block: {
            hash: 'controllerblockhash2',
            previousBlockHash: 'controllerblockhash1',
            timestamp: new Date(),
            sequence: 4,
          },
        },
      ],
    };
    await usersService.create({
      email: faker.internet.email(),
      graffiti: user1Graffiti,
      country_code: faker.address.countryCode(),
    });

    await usersService.create({
      email: faker.internet.email(),
      graffiti: user2Graffiti,
      country_code: faker.address.countryCode(),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.spyOn(graphileWorkerService, 'addJob').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /masp/head', () => {
    it('returns the latest deposit submitted', async () => {
      const head = await maspTransactionHeadService.head();

      const operation = {
        ...payload.operations[0],
        block: {
          ...payload.operations[0].block,
          previousBlockHash: head?.block_hash || uuid(),
        },
      };
      await maspTransactionsUpsertService.upsert(operation);
      await maspTransactionsUpsertService.upsert(payload.operations[1]);

      const response = await request(app.getHttpServer())
        .get(`/masp/head`)
        .set('Authorization', `Bearer ${API_KEY}`)
        .expect(HttpStatus.OK);

      expect(response.body.block_hash).toEqual(
        payload.operations[1].block.hash,
      );
    });

    it('returns the latest deposit if a block is disconnected', async () => {
      const head = await maspTransactionHeadService.head();

      const operation = {
        ...payload.operations[0],
        block: {
          ...payload.operations[0].block,
          previousBlockHash: head?.block_hash || uuid(),
        },
      };
      await maspTransactionsUpsertService.upsert(operation);
      await maspTransactionsUpsertService.upsert({
        ...payload.operations[0],
        type: BlockOperation.DISCONNECTED,
      });

      const response = await request(app.getHttpServer())
        .get(`/masp/head`)
        .set('Authorization', `Bearer ${API_KEY}`)
        .expect(HttpStatus.OK);

      expect(response.body.block_hash).toEqual(
        payload.operations[0].block.previousBlockHash,
      );
    });
  });

  describe('POST /masp', () => {
    it('upserts new masp transaction', async () => {
      const bulkUpsert = jest
        .spyOn(maspTransactionsUpsertService, 'bulkUpsert')
        .mockImplementationOnce(jest.fn());

      await request(app.getHttpServer())
        .post(`/masp`)
        .send(payload)
        .set('Authorization', `Bearer ${API_KEY}`)
        .expect(HttpStatus.ACCEPTED);

      expect(bulkUpsert).toHaveBeenCalledWith(payload.operations);
    });
  });
});
